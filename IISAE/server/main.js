import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles } from 'meteor/alanning:roles'; // https://github.com/Meteor-Community-Packages/meteor-roles
import { calculateScores } from './subscaleCalculations.js';
import { Push } from 'meteor/activitree:push';
import { FilesCollection } from 'meteor/ostrio:files';

const SEED_ADMIN = {
    username: 'testAdmin',
    password: 'password',
    email: 'testAdmin@memphis.edu',
    firstName: 'Johnny',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'admin',
    supervisorInviteCode: "12345",
    sex: 'female',
    assigned: [],
    nextModule: -1
};
const SEED_SUPERVISOR = {
    username: 'testSupervisor',
    password: 'password',
    email: 'testSupervisor@memphis.edu',
    firstName: 'Supervisor',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'supervisor',
    supervisorInviteCode: "12345",
    sex: 'male',
    assigned: [],
    nextModule: -1
};
const SEED_USER = {
    username: 'testUser',
    password: 'password',
    email: 'testUser@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'female',
    assigned: [],
    hasCompletedFirstAssessment: false,
    nextModule: 0
};
const SEED_USER2 = {
    username: 'testUserNotInIIS',
    password: 'password',
    email: 'testUserNotInIIS@memphis.edu',
    firstName: 'User',
    lastName: 'Test',
    org : "alksdjhfaslkd",
    supervisorID: "0",
    role: 'user',
    supervisorInviteCode: null,
    sex: 'male',
    assigned: [],
    hasCompletedFirstAssessment: false,
    nextModule: 0
};
const SEED_USERS = [SEED_ADMIN, SEED_SUPERVISOR, SEED_USER, SEED_USER2];
const SEED_ROLES = ['user', 'supervisor', 'admin'];

//Set Statistical Defaults;



//Configure Push Notifications
serviceAccountData = null;
//Public Dynamic Assets


Meteor.startup(() => {
    if (Meteor.isServer) {
        Meteor.publish('files.images.all', function () {
          return Images.find().cursor;
        });
    }

    //Iron Router Api
    Router.route('/api',{
    where: "server",
    action: function (){
        this.response.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        username = this.request.headers['x-user-id'];
        loginToken = this.request.headers['x-auth-token'];
        user = Meteor.users.findOne({username: username});
        isTokenExpired = true;
        keys = user.api;
        now = new Date();
        expDate = keys.expires;
        expDate.setDate(expDate.getDate())
        if(now < expDate){
            isTokenExpired = false;
        }
        if(!user || user.api.token != loginToken || isTokenExpired == true){
            this.response.end("{sucess: false, message: 'incorrect username or expired token'}");
        } else {
            organization = Orgs.findOne({orgOwnerId: user._id});
            userlist = Meteor.users.find({organization: organization._id}, {
                fields: {
                    firstname: 0,
                    lastname: 0,
                    emails: 0,
                    username: 0,
                    role: 0,
                    supervisorInviteCode: 0,
                    services: 0,
                    organization: 0,
                    api: 0
                },
            }).fetch();
            userListResponse = []
            for(i = 0; i < userlist.length; i++){
                userModules = Modules.find({userId: userlist[i]._id}).fetch();
                curUser = userlist[i];
                curUser.modules = JSON.parse(JSON.stringify(userModules));
                userListResponse.push(curUser);
            }
            organization.users = userListResponse;
            this.response.end(JSON.stringify(organization));
            }
        }
  });


    //load default JSON modules into mongo collection
    if(Modules.find().count() === 0){
        console.log('Importing Default Modules into Mongo.')
        var data = JSON.parse(Assets.getText('defaultModules.json'));
        for (var i =0; i < data['modules'].length; i++){
            newModule = data['modules'][i]['module'];
            newModule.owner = false;
            Modules.insert(newModule);
        };
    }

    //create seed roles
    for(let role of SEED_ROLES){
        if(!Meteor.roles.findOne({ '_id' : role })){
            Roles.createRole(role);
        }
    }
    let newOrgId;
    //create seed user
    for(let user of SEED_USERS){
        if (!Accounts.findUserByUsername(user.username)) {
            const uid = Accounts.createUser({
                username: user.username,
                password: user.password,
                email: user.email,
            });
            
            addUserToRoles(uid, user.role);
            if(user.role == "admin"){
                Orgs.insert({
                    orgName: "IIS",
                    orgOwnerId: uid,
                    orgDesc: "Testing",
                    newUserAssignments: []
                });
                newOrgId = Orgs.findOne({orgOwnerId: uid})._id;
                const d = new Date();
                let month = d.getMonth(); 
                let day = d.getDate();
                let year = d.getFullYear();
                let title = "test event";
                Events.insert({
                    type: "org",
                    org: newOrgId,
                    month: month,
                    day: day,
                    year: year,
                    title: title,
                    createdBy: uid
                });
                Meteor.call('generateInvite',uid);
            }

            let supervisorID = '';
            if(user.username == 'testUser'){
                supervisorID =  Accounts.findUserByUsername(SEED_SUPERVISOR.username)._id;
            }
            Meteor.users.update({ _id: uid }, 
                {   $set:
                    {
                        sex: user.sex,
                        firstname: user.firstName,
                        lastname: user.lastName,
                        supervisor: supervisorID,
                        organization: user.org ? user.org: newOrgId,
                        sex: user.sex,
                        assigned: user.assigned,
                        hasCompletedFirstAssessment: user.hasCompletedFirstAssessment,
                        nextModule: 0,
                        author: true
                    }
                }
            );
        }
    }
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
                const authors = Meteor.settings.public.authors;
                console.log(authors);
                author = false;
                if(authors.indexOf(emailAddr) !== -1){
                    author = true;
                }
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
        copiedModule.owner = orgId;
        copiedModule.title = copiedModule.title + " copy";
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
            owner: orgId,
            fallbackRoute: "nextPage",
            pageFlowVars: {
                score: 0
            }
        }
        Modules.insert(newModule);
    },
    changeModule(input){
        console.log(input);
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
                    console.log(text);
                    eval(text);
                    console.log(keys[i], typeof key);
                    subField = eval('newField[0].' + keys[i] );
                    if(typeof subField == 'string'){
                        text = 'newItem.' + keys[i] + '= \"New\"';
                        eval(text);
                        console.log('evaltext',text)
                    }
                    if(typeof subField == "object"){
                        text = 'newItem.' + keys[i] + '= []';
                        eval(text);
                        console.log('evaltext',text)
                    }
                }
                newField.push(newItem)
            
            } 
        } else {
            addedField = field.split(".");
            addedField = addedField[addedField.length - 1];
            console.log('undefined: ' + addedField);          
            if(addedField == "questions"){
                data = {
                    type :"multiChoice",
                    prompt: "New"
                }
                text = "curModule." + field + "=[data]";
                console.log(text);
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
                console.log(text);
                eval(text);
            }
            if(addedField == "answers"){
                data = {
                    answer:"New",
                }
                text = "curModule." + field + "=[data]";
                console.log(text);
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
    saveModuleData: function (moduleData, moduleId, pageId, questionId, response, answerValue){
        console.log(moduleData, moduleId, pageId, questionId, response, answerValue);
        response = moduleData.responses[moduleData.responses.length - 1].response;
        questionType = moduleData.questionType;
        curModule = Modules.findOne({_id: moduleId});
        feedback = "disabled";
        if(curModule){
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
                feedback = answerAssess(correctAnswer, response);
            }
            if(feedback == true){
                moduleData.score += parseInt(answerValue) * parseFloat(questionWeight) || parseFloat(answerValue);
            } else; {
                moduleData.score = moduleData.score;
            }
            console.log(moduleData.nextPage, moduleData.nextQuestion);
            ModuleResults.upsert({_id: moduleData._id}, {$set: moduleData});
            Meteor.users.upsert(Meteor.userId(), {
                $set: {
                curModule: {
                    moduleId: Meteor.user().curModule.moduleId,
                    pageId: moduleData.nextPage,
                    questionId: moduleData.nextQuestion,
                },
            }
        })
        return feedback;
    } else {
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
        console.log(org);
        if(typeof org.files === "undefined"){
            org.files = [];
        }
        image = Images.findOne({})
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
        Images.remove({name: fileName})
        org = Orgs.findOne({_id: Meteor.user().organization});
        orgFiles = org.files
        index = orgFiles.findIndex(x => x.name === fileName);
        orgFiles.splice(index, 1);
        Orgs.update({_id: Meteor.user().organization}, {$set: {files: orgFiles} })
    },
});

//Server Methods
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
    console.log(targetOrgId,targetOrgName,targetSupervisorId,targetSupervisorName);
    return {targetOrgId, targetOrgName, targetSupervisorId, targetSupervisorName};
}
function answerAssess(correctAnswer, response){
    if(response.toLowerCase() == correctAnswer.toLowerCase()){
        feedback = true;
    } else {
        feedback = false;
    }
    console.log(response, correctAnswer, feedback);
    return feedback;
}

//Publications and Mongo Access Control
Meteor.users.deny({
    update() { return true; }
});

Meteor.users.allow({

});

//Show current user data for current user
Meteor.publish(null, function() {
    return Meteor.users.find({_id: this.userId});
});


//allow admins to see all users of org, Can only see emails of users. Can See full data of supervisors
Meteor.publish('getUsersInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin' )){ 
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user' });
    }
    else if(Roles.userIsInRole(this.userId, 'supervisor')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'user', supervisor: this.userId})
    }
});

Meteor.publish('getSupervisorsInOrg', function() {
    if(Roles.userIsInRole(this.userId, 'admin')){
        return Meteor.users.find({ organization: Meteor.user().organization, role: 'supervisor' });
    }
});

//Allow users access to Org information
Meteor.publish(null, function() {
    if(Meteor.user()){
        return Orgs.find({_id: Meteor.user().organization});
    }
});

//allow the use of Roles.userIsInRole() accorss client
Meteor.publish(null, function () {
    if (this.userId) {
        return Meteor.roleAssignment.find({ 'user._id': this.userId });
    } 
    else {
        this.ready()
    }
});
//allow current module pages to be published
Meteor.publish('curModule', function (id) {
    return Modules.find({_id: id});
});
//allow all modules to be seen
Meteor.publish('modules', function () {
    return Modules.find({});
});
//get module results
Meteor.publish('getUserModuleResults', function (id) {
    return ModuleResults.find({});
});

Meteor.publish('getModuleResultsByTrialId', function (id) {
    return ModuleResults.find({_id: id});
});
//get my events
Meteor.publish(null, function() {
    return Events.find({createdBy: this.userId});
});

//get all organization events
Meteor.publish('events', function() {
    console.log(Meteor.user().organization, this.userId)
    if(Meteor.user()){
        return Events.find({$or: [{ $and: [{org: Meteor.user().organization},{createdBy: this.userId}]},{$and:[{createdBy: Meteor.user().supervisor},{type:"Supervisor Group"}]},{$and: [{org: Meteor.user().organization},{type: "All Organization"}]},{type:this.userId}]}, {sort: {year:1 , month:1, day:1, time:1}})
    }
});