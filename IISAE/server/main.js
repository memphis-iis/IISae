import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { calculateScores } from './subscaleCalculations.js';
import { Push } from 'meteor/activitree:push';
import { FilesCollection } from 'meteor/ostrio:files';
import { insertSeedData } from './seedData'
import { LSA } from './macineLearning/LSA'
import { answerAssess } from './answerAssess'

export { addUserToRoles }

//Configure Push Notifications
serviceAccountData = null;
//Public Dynamic Assets

//LSA Defaults
const defaultStopWords = ['a','and','an','are','as','at','be','by','for','from','has','he','in','is','it','its','of','on','that','the','to','was','were','will','with','she'];
const defaultIgnoreChars = ['\'','!','.',',','!','?',';',':'];

Meteor.startup(async function() {
    if (Meteor.isServer) {
        Meteor.publish('files.images.all', function () {
          return FileStore.find().cursor;
        });
    }

    //load default JSON assessment/modules into mongo collection
    insertDefaultAssignments().then(function(){
        if(Meteor.isDevelopment) insertSeedData();
    });  
});

//Global Methods
Meteor.methods({
    getInviteInfo,
    createNewUser: function(user, pass, emailAddr, firstName, lastName, sex, gender, linkId=""){
        if(linkId){
            var {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName} = getInviteInfo(linkId);    
            var organization = Orgs.findOne({_id: targetOrgId});          
        } else {
            var targetOrgId = null
            var targetSupervisorId = null;  
            var organization = {newUserAssignments: []};   
        }
        if (!Accounts.findUserByUsername(user)) {
            if (!Accounts.findUserByEmail(emailAddr)){
                const uid = Accounts.createUser({
                    username: user,
                    password: pass,
                    email: emailAddr
                });
                Meteor.users.update({ _id: uid }, 
                    {   $set: 
                        {
                            sex: sex,
                            firstname: firstName,
                            lastname: lastName,
                            organization: targetOrgId,
                            supervisor: targetSupervisorId,
                            supervisorInviteCode: null,
                            hasCompletedFirstAssessment: false,
                            gender: gender,
                            assigned: organization.newUserAssignments || [],
                            nextModule: 0,
                            author: author
                        }
                    });
                if(linkId != ""){
                    addUserToRoles(uid, 'user');
                } else {
                    addUserToRoles(uid, 'admin');
                }
            }
            else{
                throw new Meteor.Error ('user-already-exists', `Email ${emailAddr} already in use`);
            }
        }
        else{
            throw new Meteor.Error ('user-already-exists', `User ${user} already exists`);
        }
    },
    createOrganization: function(newOrgName, newOrgOwner, newOrgDesc, useDefaultFlow){
        allModules = Modules.find().fetch();
        newUserAssignments = [];
        if(useDefaultFlow){
            for(i=0; i<allModules.length; i++){
                modules = allModules[i]._id;
                data = {
                    assignment: modules,
                    type: "module"
                }
                newUserAssignments.push(data);
            }
        }
        Orgs.insert({
            orgName: newOrgName,
            orgOwnerId: newOrgOwner,
            orgDesc: newOrgDesc,
            newUserAssignments: newUserAssignments
        });
        newOrgId = Orgs.findOne({orgOwnerId: newOrgOwner})._id;
        Meteor.users.update({ _id: newOrgOwner }, 
            {   $set: 
                {
                    organization: newOrgId,
                }
            });
        return true;
    },
    generateInvite: function(supervisorId){
        var link = '';
        var length = 5;
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        var unique = false;
        while(unique == false){;
            for ( var i = 0; i < length; i++ ) {
                link += characters.charAt(Math.floor(Math.random() * charactersLength));
            }  
            linkFound = Meteor.users.find({supervisorInviteCode: link}).fetch().length; 
            if(linkFound == 0){
                unique = true;
            } else {
                link = "";
            }
        }
        Meteor.users.update({ _id: supervisorId }, 
        {   $set: 
            {
                supervisorInviteCode: link
            }
        });
        return link;
    },
    destroyUser: function(userID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){
            Meteor.users.remove(userID);
        }
    },
    removeSupervisor: function(userId){
        //removes a user from supervisors list if added by mistake. 
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'user');
            removeUserFromRoles(userId, 'supervisor');
        }
    },
    editSupervisor: function(supervisorID) {
        if(Roles.userIsInRole(this.userId, ['admin'])){

        }
    },
    addSupervisor: function(userId) {
        //elevate user with user role to supervisor
        if(Roles.userIsInRole(this.userId, 'admin')){
            addUserToRoles(userId, 'supervisor');
            removeUserFromRoles(userId, 'user');
        }
    },
    changeAssignmentToNewUsers: function(assignment){
        Orgs.upsert({_id: Meteor.user().organization},{$set: {newUserAssignments: assignment}});
    },
    assignToAllUsers: function(assignment){
        org = Meteor.user().organization;
        allUsers = Meteor.users.find({organization: org, role: 'user'}).fetch();
        for(i = 0; i < allUsers.length; i++){
            curAssignments = allUsers[i].assigned;
            if(!curAssignments.includes(assignment)){
                curAssignments.push(assignment);
            }
            Meteor.users.upsert({_id: allUsers[i]._id}, {$set: {assigned: curAssignments}});
        }
    },
    changeAssignmentOneUser: function(input){
        userId = input[0];
        assignment = input[1];
        Meteor.users.upsert({_id: userId},{$set: {assigned: assignment}});
    },
    deleteModule: function(module){
        Modules.remove({_id: module});
    },
    copyModule: function(input){
        orgId = input.newOwner;
        newModule = input.module;
        copiedModule = Modules.findOne({_id: newModule});
        delete copiedModule._id;
        copiedModule.owner = Meteor.userId();
        copiedModule.title = copiedModule.title + " copy";
        copiedModule.orgOwnedBy = orgId;
        copiedModule.public = false;
        Modules.insert(copiedModule);
    },
    createModule: function(){
        orgId = Meteor.user().organization,
        newModule = {
            title: "New Module",
            identifier: "New",
            display: false,
            description: "Description",
            pages: [],
            public: false,
            owner: this.userId,
            orgOwnedBy: orgId,
            fallbackRoute: "nextPage",
            pageFlowVars: {
                score: 0
            }
        }
        Modules.insert(newModule);
    },
    changeModule(input){
        moduleId = input.moduleId;
        field = input.field;
        result = input.result
        curModule = Modules.findOne({_id: moduleId});
        text = "curModule." + field + "=" + result;
        eval(text);
        Modules.update(moduleId, {$set: curModule});
    },
    deleteModuleItem(input){
        moduleId = input.moduleId;
        field = input.field;
        curModule = Modules.findOne({_id: moduleId})
        fieldParsed = field.split(".")
        item = fieldParsed[fieldParsed.length - 1].split("[");
        index = item[1].substring(0, item[1].length - 1);
        index = parseInt(index);
        if(fieldParsed.length == 1){
            items = eval("curModule." + item[0])
        } else {
            prefix = "";
            for(i = 0; i < fieldParsed.length - 1; i++){
                prefix+=fieldParsed[i] + ".";
            }
            items = eval("curModule." + prefix + item[0])
        }
        items.splice(index, 1);
        text = "curModule." + item[0] + "=items";
        eval(text);
        Modules.update(moduleId, {$set: curModule});
    },
    addModuleItem(input){
        moduleId = input.moduleId;
        field = input.field;
        curModule = Modules.findOne({_id: moduleId});
        text = "curModule." + field;
        newField = eval(text);
        if(typeof newField !== "undefined" && typeof newField[0] !== "undefined"){
            if(typeof newField[0] === "object"){
                keys = Object.keys(newField[0]);
                newItem = {};
                for(i = 0; i < keys.length; i++){
                    text = "newField[0]." + keys[i];
                    eval(text);
                    subField = eval('newField[0].' + keys[i] );
                    if(typeof subField == 'string'){
                        text = 'newItem.' + keys[i] + '= \"New\"';
                        eval(text);
                    }
                    if(typeof subField == "object"){
                        text = 'newItem.' + keys[i] + '= []';
                        eval(text);
                    }
                }
                newField.push(newItem)
            
            } 
        } else {
            addedField = field.split(".");
            addedField = addedField[addedField.length - 1];
            if(addedField == "questions"){
                data = {
                    type :"multiChoice",
                    prompt: "New"
                }
                text = "curModule." + field + "=[data]";
                eval(text);
            }
            if(addedField == 'autoTutorScript'){
                data = 
                    {
                        role: "teacher",
                        character: "default",
                        script: "text script",
                    };
                text = "curModule." + field + "=[data]";
                eval(text);
            }
            if(addedField == 'answerCorpera'){
                data = 
                {
                    corpus: "text script",
                };
            text = "curModule." + field + "=[data]";
            eval(text);
            }
            if(addedField == 'nextFlow'){
                data =  
                    {
                        condition: "",
                        operand: "=",
                        threshold: 1,
                        route: 0
                    };
                text = "curModule." + field + "=[]; curModule." + field + ".push(data)";
               eval(text);
            }
            if(addedField == 'autoTutorCharacter'){
                data = 
                    {
                        role: "teacher",
                        name: "Phil",
                        template: "default",
                    };
                text = "curModule." + field + "=[data]";
                eval(text);
            }
            if(addedField == "pages" || addedField == "fields"){
                data = {
                    type :"New",
                    text: "New",
                    nextFlow: [],
                    pageFlowVars: {
                        score: 0
                    }
                }
                text = "curModule." + field + "=[data]";
                eval(text);
            }
            if(addedField == "answers"){
                data = {
                    answer:"New",
                }
                text = "curModule." + field + "=[data]";
                eval(text);
            }
        }
        Modules.upsert(moduleId, {$set: curModule});
    },
    //assessment data collection
    createNewModuleTrial: function(data){
        const results = ModuleResults.insert(data);
            Meteor.users.update(Meteor.userId(), {
                $set: {
                curModule: {
                    moduleId: results,
                    pageId: 0,
                    questionId: 0,
                    score: 0
                 }
                }
            });
        return results;
    },
    initiateNewResponse: function (moduleData){
        ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
    },
    saveModuleData: function (moduleData, moduleId, pageId, questionId, response, answerValue){
        console.log(moduleData, moduleId, pageId, questionId, response, answerValue)
        response = response;
        questionType = moduleData.questionType;
        curModule = Modules.findOne({_id: moduleId});
        feedback = "disabled";
        if(curModule && pageId !== "completed"){
            correctAnswer = curModule.pages[pageId].questions[questionId].correctAnswer
            enableFeedback = curModule.enableFeedback
            enableWeightedQuestions = curModule.enableWeightedQuestions;
            questionWeight = 1;
            if(!moduleData.score){
                moduleData.score = 0;
            }
            if(enableWeightedQuestions){
                questionWeight = curModule.pages[pageId].questions[0].weight
            }
            if(enableFeedback){
                feedback = answerAssess(correctAnswer, response).isCorrect;
            }
            if(feedback == true){
                moduleData.score += parseInt(answerValue) * parseFloat(questionWeight);
            } else; {
                moduleData.score = parseInt(moduleData.score);
            }
            ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            Meteor.users.upsert(Meteor.userId(), {
                $set: {
                    curModule: {
                        moduleId: Meteor.user().curModule.moduleId,
                        pageId: moduleData.nextPage,
                        questionId: moduleData.nextQuestion,
                    },
                }
            });
            return feedback;
        } else {
            ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            Meteor.users.upsert(Meteor.userId(), {
                $set: {
                    curModule: {
                        moduleId: Meteor.user().curModule.moduleId,
                        pageId: moduleData.nextPage,
                        questionId: moduleData.nextQuestion,
                    },
                }
            });
            return false;
        }
    },
    overrideUserDataRoutes: function (moduleData){
        ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
        Meteor.users.upsert(Meteor.userId(), {
            $set: {
                curModule: {
                    moduleId: Meteor.user().curModule.moduleId,
                    pageId: moduleData.nextPage,
                    questionId: moduleData.nextQuestion,
                }
            }
        });
    },
    getPrivateImage: function(fileName){
        result =  Assets.absoluteFilePath(fileName);
        return result;
    },
    generateApiToken: function(userId){
        var newToken = "";
        var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < 16; i++ ) {
            newToken += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        var future = new Date();
        future.setDate(future.getDate() + 30);
        Meteor.users.update(userId, {
            $set: {
              api: {
                  token: newToken,
                  expires: future
              }
            }
        });
    },
    createEvent: function(type, month, day, year, time, title, importance){
        Events.insert({
            type: type,
            org: Meteor.user().organization,
            month: month,
            day: day,
            year: year,
            title: title,
            time: time,
            importance: importance,
            createdBy: this.userId
        })
    },
    deleteEvent: function(eventId){
        Events.remove({_id: eventId})
    },
    addFileToOrg: function(filePath, fileName,type){
        org = Orgs.findOne({_id: Meteor.user().organization});
        if(typeof org.files === "undefined"){
            org.files = [];
        }
        image = FileStore.findOne({})
        data = {
            filePath: filePath,
            name: fileName,
            type: type,
            dateUploaded: Date.now()
        }
        org.files.push(data);
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: org.files} })
    },
    deleteFileFromOrg: function(fileName){
        FileStore.remove({name: fileName})
        org = Orgs.findOne({_id: Meteor.user().organization});
        orgFiles = org.files
        index = orgFiles.findIndex(x => x.name === fileName);
        orgFiles.splice(index, 1);
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: orgFiles} })
    },
    makeGoogleTTSApiCall: async function(message, moduleId=false) {
        console.log(message,moduleId);
        if(moduleId !== false){
            curModule = Modules.findOne({_id: moduleId});
            if(curModule.googleAPIKey){
                ttsAPIKey = curModule.googleAPIKey;
            } 
        }
        console.log(ttsAPIKey);
        const request = JSON.stringify({
            input: {text: message},
            voice: {languageCode: 'en-US', ssmlGender: 'FEMALE'},
            audioConfig: {audioEncoding: 'MP3', speakingRate: 1, volumeGainDb: .5},
        });
        const options = {
            hostname: 'texttospeech.googleapis.com',
            path: '/v1/text:synthesize?key=' + ttsAPIKey,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            }
        }
        return await makeHTTPSrequest(options, request).then(data => {
            response = JSON.parse(data.toString('utf-8'))
            const audioDataEncoded = response.audioContent;
            return audioDataEncoded;
        });
    },
    processAudio(arrayBuffer, fileName, moduleId, ){
        FileStore.write(arrayBuffer, {
            fileName: fileName,
            meta: {moduleId: moduleId}
        }, async function(writeError, fileRef){
            if(writeError){
                console.log(writeError);
                return false;
            } else {
                moduleId = fileRef.meta.moduleId;
                link = FileStore.link(fileRef);
                moduleData = ModuleResults.findOne({_id: moduleId});
                moduleData.responses[moduleData.responses.length - 1].audioClip = link;
                ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            }
        });
        if(true){
            moduleData = ModuleResults.findOne({_id: moduleId});
            makeGoogleSpeechRequest(arrayBuffer, moduleData.moduleId, moduleId)
        }
    },

    // LSA Functions
    createCorpera(spacename, stopWords=defaultStopWords, ignorechars=defaultIgnoreChars){
        newLSA = new LSA(spacename, stopWords, ignorechars);
        data = newLSA.dump();
        id = LSASpaces.insert(data);
        return id;
    },
    addCorpus(id, corpusText){
        newLSA = new LSA(spacename="temp",stopWords=defaultStopWords, ignorechars=defaultIgnoreChars);
        lsaData = LSASpaces.findOne({_id: id});
        console.log(lsaData);
        newLSA.restore(lsaData);
        newLSA.parse(corpusText);
        newLSA.build();
        newLSA.TFIDF();
        newLSA.calc();
        data = newLSA.dump();
        dataConverted = {};
        keys = Object.keys(data);
        values = Object.values(data);
        
        LSASpaces.update({'_id': data._id},{dataConverted}
        );
    },
    testResponse(id, responseText){
        newLSA = new LSA(spacename="temp",stopWords=defaultStopWords, ignorechars=defaultIgnoreChars);
        lsaData = LSASpaces.findOne({_id: id});
        newLSA.restore(lsaData);
        return newLSA.assess(responseText);
    },
    createClass(flow=[]){
        var link = '';
        var length = 5;
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        var unique = false;
        while(unique == false){;
            for ( var i = 0; i < length; i++ ) {
                link += characters.charAt(Math.floor(Math.random() * charactersLength));
            }  
            linkFound = Classes.find({inviteLink: link}).fetch().length; 
            if(linkFound == 0){
                unique = true;
            } else {
                link = "";
            }
        }
        data = {
            owner: this.userId,
            organization: Meteor.user().organization,
            students: [],
            flow: flow,
            inviteLink: link,
            name: "New Class"
        }
        Classes.insert(data);
    },
    joinClassByCode(code){
        userId = Meteor.userId();
        user = Meteor.users.findOne({_id: userId});
        addClass = Classes.findOne({inviteLink: code});
        data = {
            classId: addClass._id,
            assignments: []
        }
        classList = user.classList || [];
        classList.push(data);
        Meteor.users.update({ _id: userId }, 
            {   $set: 
                {
                    classList: classList
                }
            });
        students = Classes.findOne({inviteLink: code}).students;
        student = {
            id: userId,
            firstName: user.firstname,
            lastName: user.lastname
        }
        students.push(student);
        Classes.update({inviteLink: code},{
            $set:
            {
                students: students
            }
        })
    },
    addUserToClass(classId,userId){
        user = Meteor.users.findOne({_id: userId});
        addClass = Classes.findOne({_id: classId});
        data = {
            classId: classId,
            assignments: []
        }
        classList = user.classList || [];
        classList.push(data);
        Meteor.users.update({ _id: userId }, 
            {   $set: 
                {
                    classList: classList
                }
            });
        students = Classes.findOne({"_id":classId}).students;
        student = {
            id: userId,
            firstName: user.firstname,
            lastName: user.lastname
        }
        students.push(student);
        Classes.update({_id: classId},{
            $set:
            {
                students: students
            }
        })
    },
    removeUserFromClass(classId, userId){
        user = Meteor.users.findOne({_id: userId});
        classList = user.classList || [];
        classList.splice(classId,1);
        Meteor.users.update({ _id: userId }, 
            {   $set: 
                {
                    classList: classList
                }
            });
        students = Classes.findOne({"_id":classId}).students;
        students = students.filter(function(obj){
            return obj.id !== userId;
        });
        Classes.update({_id: classId},{
            $set:
            {
                students: students
            }
        })
    },
    deleteClass(id){
        Classes.remove({"_id": id});
    },
    copyClass(id){
        data = Classes.findOne({"_id": id});
        var link = '';
        var length = 5;
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        var unique = false;
        while(unique == false){;
            for ( var i = 0; i < length; i++ ) {
                link += characters.charAt(Math.floor(Math.random() * charactersLength));
            }  
            linkFound = Classes.find({inviteLink: link}).fetch().length; 
            if(linkFound == 0){
                unique = true;
            } else {
                link = "";
            }
        }
        dataNew = {
            owner: this.userId,
            organization: Meteor.user().organization,
            students: [],
            flow: data.flow,
            name: data.name + " copy",
            inviteLink: link
        } 
        Classes.insert(dataNew);
    },
    assignModuleToClass(classId,moduleId){
        moduleName = Modules.findOne({"_id":moduleId}).title;
        prevFlow = Classes.findOne({"_id":classId}).flow;
        newFlow = prevFlow;
        data = {
            moduleId: moduleId,
            title: moduleName
        }
        newFlow.push(data);
        Classes.update({"_id":classId}, {$set:{flow: newFlow}});
    },
    removeModuleFromClass(classId,index){
        prevFlow = Classes.findOne({"_id":classId}).flow;
        newFlow = prevFlow;
        newFlow.splice(index, 1);
        Classes.update({"_id":classId}, {$set:{flow: newFlow}});
    },
    changeClassAssignment(classId, flow){
        Classes.update({"_id":classId}, {$set:{flow: flow}});
    },
    changeClassName(classId, name){
        Classes.update({"_id":classId}, {$set:{name: name}});
    }
});

//Server Methods

async function makeGoogleSpeechRequest(buffer, trialId=false, moduleId) {
    var audioString = Buffer.from(buffer).toString('base64');
    if(trialId !== false){
        curModule = Modules.findOne({_id: trialId});
        if(curModule.googleAPIKey){
            speechAPIkey = curModule.googleAPIKey;
        } 
    }
    const request = JSON.stringify({
        'config':{
            "encoding": 'WEBM_OPUS',
            "sampleRateHertz": 48000,
            "languageCode": "en-US",
            "enableWordTimeOffsets": false
        },
        'audio':{
            'content': audioString
        }
    });
    const options = {
        hostname: 'speech.googleapis.com',
        path: '/v1/speech:recognize?key=' + speechAPIkey,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=utf-8'
        }
    }
    return await makeHTTPSrequest(options, request).then(data => {
        response = JSON.parse(data.toString('utf-8'));
        moduleData = ModuleResults.findOne({_id: moduleId});
        if(response.results[0].alternatives[0].confidence > 0.65){
            moduleData.responses[moduleData.responses.length - 1].transcription = response.results;
            ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            console.log(moduleId, response, response.results[0].alternatives[0].confidence);
        } else {
            moduleData.responses[moduleData.responses.length - 1].transcription = false;
            ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            console.log(moduleId, response, response.results[0].alternatives[0].confidence);
        }
    });
}

function addUserToRoles(uid, roles){
    Roles.addUsersToRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
}

function removeUserFromRoles(uid, roles){
    Roles.removeUsersFromRoles(uid, roles);
    Meteor.users.update({ _id: uid }, { $set: { role: Roles.getRolesForUser(uid)[0] }});
}

function serverConsole(...args) {
    const disp = [(new Date()).toString()];
    for (let i = 0; i < args.length; ++i) {
      disp.push(args[i]);
    }
    // eslint-disable-next-line no-invalid-this
    console.log.apply(this, disp);
}

function getInviteInfo(inviteCode) {
    supervisor = Meteor.users.findOne({supervisorInviteCode: inviteCode});
    targetSupervisorId = supervisor._id;
    organization = Orgs.findOne({_id: supervisor.organization});
    targetSupervisorName = supervisor.firstname + " " + supervisor.lastname;
    targetOrgId = supervisor.organization;
    targetOrgName = organization.orgName;
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
}
async function insertDefaultAssignments(){
    if(Modules.find().count() === 0){
        console.log('Importing Default Modules into Mongo.')
        var data = JSON.parse(Assets.getText('defaultModules.json'));
        for (var i =0; i < data['modules'].length; i++){
            newModule = data['modules'][i]['module'];
            newModule.owner = false;
            await Modules.insert(newModule);
        };
    }
}

async function makeHTTPSrequest(options, request){
    const https = require('https');
    return new Promise((resolve, reject) => {
        let chunks = []
        const req = https.request(options, res => {        
            res.on('data', d => {
                chunks.push(d);
            })
            res.on('end', function() {
                resolve(Buffer.concat(chunks));
            })
        })
        
        req.on('error', (e) => {
            reject(e.message);
        });
    
        req.write(request)
        req.end()
    });
}
