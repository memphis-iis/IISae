Template.profile.helpers({
    'assignment': function(){
        assigned = Meteor.user().assigned;
        assignment = {};
        if(assigned.length === 0){
            assignment = false;
        } else {
            assignment.show = true;
            assignment.isAssessment = false;
            assignment.isModule = false;
            if(assigned[0].type == "assessment"){
                assignment = Assessments.findOne({_id: assigned[0].assignment});
                assignment.isAssessment = true;
            }

            if(assigned[0].type == "module"){
                assignment = Modules.findOne({_id: assigned[0].assignment});
                assignment.isModule = true;
            }
        }
        return assignment;
    },
    'userIsAdminOrSupervisor': () => Roles.userIsInRole(Meteor.userId(), ['admin', 'supervisor']),
})

Template.profile.events({
    'click #startAssessment': function(){
        assignment = $(event.target).data("assignment-id");
        target = "/assessment/" + assignment
        Router.go(target);
    },
    'click #startModule': function(){
        assignment = $(event.target).data("assignment-id");
        target = "/module/" + assignment
        Router.go(target);
    },
    'click #assessmentCenter': function(){
        target = "/assessmentCenter/";
        Router.go(target);
    },
    'click #moduleCenter': function(){
        target = "/moduleCenter/";
        Router.go(target);
    },
    'click #controlPanel': function(){
        target = "/control-panel/";
        Router.go(target);
    },
    'click #calendar': function(){
        target = "/calendar/";
        Router.go(target);
    },
    'click #logout': function(){
        Meteor.logout();
        Router.go("/");
    },
})


Template.profile.onCreated(function() {let text = data.text
    let audioPromptSpeakingRate = 1
    let audioVolume = .5
    Meteor.call('makeGoogleTTSApiCall', text, audioPromptSpeakingRate, audioVolume, function(err, res) {
        if(err){
            console.log("Something went wrong with TTS, ", err)
        }
        if(res != undefined){
            const audioObj = new Audio('data:audio/ogg;base64,' + res)
            window.currentAudioObj = audioObj;
            audioObj.play();
        }
    });
    Meteor.subscribe('assessments');
})