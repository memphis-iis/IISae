Template.moduleReport.helpers({
    'generalinfo': function (){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        dateAccessed = new Date(0);
        data = { 
            lastAccessed: dateAccessed,
            title: modData.title,
            lastAccessed: resultsData.lastAccessed,

        }
        return data;
    },

    'responses': function(){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        for(result of resultsData.responses){
            pageId = result.pageId;
            questionId = result.questionId;
            if(typeof pageId != "undefined" && typeof questionId != "undefined"){
                console.log("here");
                result.correctanswer = modData.pages[result.pageId].questions[result.questionId].correctAnswer || "N/A";
                result.prompt = modData.pages[result.pageId].questions[result.questionId].prompt || "N/A";
            }
        }
        return resultsData.responses;
    },
})

Template.moduleReport.events({
    'click #controlpanel': function(event){
        event.preventDefault();
        target = "/control-panel/";
        window.location.href = target;
    },
})


Template.moduleReport.onCreated(function() {
    Meteor.subscribe('modules');
})
