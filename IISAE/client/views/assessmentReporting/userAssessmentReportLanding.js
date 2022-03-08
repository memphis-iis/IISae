Template.userAssessmentReportLanding.helpers({
    'trialsList': getAssessments,
})

function getAssessments(){
    let userId = Meteor.userId();
    if(Roles.userIsInRole(Meteor.userId(), 'supervisor')){
        userId = Router.current().params._userid;
    }
    let trials = Trials.find({'userId': userId}, {sort: {assessmentName: 1, _id:-1}}).fetch();
    let uniqueTrials = [];
    let trialsRet = []
    for(let trial of trials){
        if(!uniqueTrials.includes(trial.identifier)){
            trial.lastAccessed = trial.lastAccessed.toUTCString();
            uniqueTrials.push(trial.identifier);
            trialsRet.push(trial)
            trialsRet[trialsRet.length - 1].link = generateLinks(userId, trial.identifier)
        }
    }
    return trialsRet
}

function generateLinks(userId, identifier){
    if(Roles.userIsInRole(Meteor.userId(), 'supervisor')){
        return `/userAssessmentReport/supervisor/${userId}/${identifier}`
    }
    return `/userAssessmentReport/${identifier}`
}
Template.userAssessmentReportLanding.onCreated(function() {
    Meteor.subscribe('usertrials');
})
