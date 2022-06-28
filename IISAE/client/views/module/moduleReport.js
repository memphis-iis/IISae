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
    'timeline': function(){ 
        timeline = [];
        resultsData = ModuleResults.findOne();
        startTime = resultsData.responses[0].events[0].time;
        console.log(startTime);
        modData = Modules.findOne({_id: resultsData.moduleId})
        for(result of resultsData.responses){
            pageId = result.pageId;
            questionId = result.questionId;
            if(typeof pageId != "undefined" && typeof questionId != "undefined"){
                for(events of result.events){
                    data = {
                        pageId: pageId,
                        questionId: questionId,
                        actor: events.actor,
                        verb: events.verb,
                        time: (events.time - startTime) / 1000,
                        data: JSON.stringify(events.data)
                    }
                    timeline.push(data);
                }
            }
        }
        console.log(timeline);
        return timeline;
    },
    'responses': function(){
        resultsData = ModuleResults.findOne();
        modData = Modules.findOne({_id: resultsData.moduleId})
        for(result of resultsData.responses){
            pageId = result.pageId;
            questionId = result.questionId;
            if(typeof pageId != "undefined" && typeof questionId != "undefined"){
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
