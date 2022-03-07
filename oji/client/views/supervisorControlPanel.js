Template.supervisorControlPanel.helpers({
        'usersList': () => Meteor.users.find({ role: 'user', organization: Meteor.user().organization, supervisor: Meteor.userId()}, { sort: {lastname: 1, firstname: 1, _id: 1}}).fetch(),
        'orgViewOn': function(){
            const t = Template.instance();
            userId = t.selectedUser.get();
            if(userId == 'org'){
                return true;
            } else {
                return false;
            }
        },
        
        'organization': () => Orgs.findOne(),
    
        'apiKeys': function (){
            keys = Meteor.user().api;
            isExpired = false;
            now = new Date();
            expDate = keys.expires;
            expDate.setDate(expDate.getDate());
            if(now >= expDate || typeof keys.token === 'undefined'){
                isExpired = true;
            }
            api = {
                token: keys.token,
                expires: expDate,
                expired: isExpired,
                curlExample: "curl " + window.location.protocol + "//" + window.location.host + "/api -H \"x-user-id:" + Meteor.user().username +"\" -H \"x-auth-token:" + keys.token + "\""
            }

            return api;
        },

        'showToken': true,

        'orgLink': () => window.location.protocol + "//" + window.location.host + "/signup/" + Meteor.user().supervisorInviteCode,

        'modules': function() {
            const t = Template.instance();
            userId = t.selectedUser.get();
            data = ModuleResults.find({userId: userId}).fetch();
            results = [];
            for(i = 0; i < data.length; i++){
                moduleInfo = Modules.findOne({_id: data[i].moduleId})
                dateAccessed = new Date(0);
                dateAccessed.setUTCSeconds(parseInt(data[i].lastAccessed))
                completed = false;
                if(data[i].nextPage == "completed"){
                    completed = true;
                }
                dataToPush = {
                    id: data[i]._id,
                    lastAccessed: dateAccessed,
                    title: moduleInfo.title,
                    lastPage: data[i].nextPage,
                    totalPages : moduleInfo.pages.length,
                    percentDone: (data[i].nextPage / moduleInfo.pages.length * 100).toFixed(0),
                    completed: completed
                };
                results.push(dataToPush);
            }
            if(results.length == 0){
                results = false;
            }
            return results;
    },
    'assessments': function() {
            console.log('test');
            const t = Template.instance();
            userId = t.selectedUser.get();
            data = Trials.find({userId: userId}).fetch();
            console.log(data.length);
            results = [];
            for(i = 0; i < data.length; i++){
                console.log("data", data[i])
                assessmentInfo = Assessments.findOne({_id: data[i].assessmentId})
                console.log(assessmentInfo);
                completed = false;
                if(data[i].completed == "true"){
                    completed = true;
                }
                dataToPush = {
                    id: data[i]._id,
                    lastAccessed: data[i].lastAccessed,
                    title: assessmentInfo.title,
                    lastPage: data[i].curQuestion || 0,
                    totalPages : assessmentInfo.questions.length,
                    percentDone: (data[i].curQuestion / assessmentInfo.questions.length * 100).toFixed(0),
                    completed: completed
                };
                results.push(dataToPush);
            }
            console.log(results);
            if(results.length == 0){
                results = false;
            }
            return results;   
        }
});

Template.supervisorControlPanel.events({
    'click #usersEditButton': function(){
        alert("edit click")
    },

    'click #usersDestroyButton': function(event){
        event.preventDefault();
        if (window.confirm(`Are you sure you want to delete user ${event.currentTarget.getAttribute("data-lastname")}, ${event.currentTarget.getAttribute("data-firstname")}? This cannot be undone.`)){
            Meteor.call('destroyUser', event.currentTarget.getAttribute("data-userid"));
        }
    },

    'click #userPromoteButton': function(event){
        Meteor.call('addSupervisor', event.currentTarget.getAttribute("data-userID"));
    },
    
    'click #gen-key': function(event){
        Meteor.call('generateApiToken', Meteor.userId());
    },
    'click #regen-link': function(event){
        Meteor.call('generateInvite', Meteor.userId());
    },
    'change #user-select': function(event){
        const t = Template.instance();
        t.selectedUser.set(event.target.value);
        $('#user-select').val(t.selectedUser.get())
    },
})

Template.supervisorControlPanel.onCreated(function() {
    Meteor.subscribe('getUsersInOrg');
    Meteor.subscribe('assessments');
    Meteor.subscribe('usertrials');
    Meteor.subscribe('getUserModuleResults');
    Meteor.subscribe('modules');
    this.selectedUser = new ReactiveVar("org");
})