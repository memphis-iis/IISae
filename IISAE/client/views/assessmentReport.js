Template.assessmentReport.helpers({
    'generalinfo': function (){
        resultsData = Trials.findOne();
        assessmentData = Assessments.findOne({_id: resultsData.assessmentId});
        data = { 
            title: assessmentData.title,
            lastAccessed: resultsData.lastAccessed,
            questions: []
        }
        for(i=0; i < resultsData.data.length; i++){
            responseText= assessmentData.answers[resultsData.data[i].response];
            qData = {
                question: assessmentData.questions[i].text,
                response: resultsData.data[i].response,
                responseText: responseText,
                value: resultsData.data[i].responseValue,
                subscales: assessmentData.questions[i].subscales
            }
            data.questions.push(qData);
        }
        return data;
    },
})

Template.assessmentReport.events({
    'click #controlpanel': function(event){
        event.preventDefault();
        target = "/control-panel/";
        window.location.href = target;
    },
})


Template.assessmentReport.onCreated(function() {
    Meteor.subscribe('assessments');
})
