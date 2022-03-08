Template.assessmentCenter.helpers({
    'assessment': getAssessments
})

Template.assessmentCenter.events({
    'click .startAssessment': function(event){
        event.preventDefault();
        target = "/assessment/" + event.target.id;
        window.location.href = target;
    },
})

Template.assessmentCenter.onCreated(function() {
    Meteor.subscribe('assessments');
    Meteor.subscribe('usertrials');
})

function getAssessments(){
    return Assessments.find({})
}