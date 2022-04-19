Template.module.onRendered(function (){
    moduleData = Modules.findOne();
    const t = Template.instance();
    autoTutorReadsPrompt = moduleData.autoTutorReadsPrompt;
    promptToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt;
    console.log(Meteor.user().curModule.questionId);
    if(autoTutorReadsPrompt && promptToRead){
        readTTS(t, promptToRead);
    } 
});

Template.module.helpers({
    'module': () => Modules.findOne(),
    'trialData': function(){
        let moduleId = Meteor.user().curModule.moduleId;
        let moduleData = ModuleResults.findOne({_id: moduleId});
        return moduleData;
    },
    'pageid': function() {return parseInt(this.pageId);},
    'questionid': function() {return parseInt(this.questionId) + 1;},
    'totalpages': function(){
        return Modules.findOne().pages.length;
    },
    'completed' : function(){
        if(this.pageId == "completed"){
            return true;
        } else {
            return false;
        }
    },
    'page': function(){
        $('#refutation').removeClass('alert-success');
        $('#refutation').removeClass('alert-danger');
        $('#refutation').text("");
        $('#refutation').hide();
        $(':button').prop('disabled', false); 
        $(':button').removeClass('btn-info');
        page = Modules.findOne().pages[parseInt(this.pageId)];
        const t = Template.instance();
        if(page){
            if(page.type == "text"){
                page.typeText = true;
                t.pageType.set("text");
            };
            if(page.type == "activity"){
                page.typeActivity = true;
                t.pageType.set("activity");
            };
            if(!page.imgStyle){
                page.imgStyle = "max-width:50%; height:auto; margin:10px;"
            }
        }
        return page;
    },
    'question': function(){
        curModule = Modules.findOne();
        autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
        page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        const t = Template.instance();

        if(question.type == "blank"){
            question.typeBlank = true;
        };
        if(question.type == "multiChoice"){
            question.typeMultiChoice = true;
        };
        if(question.type == "longText"){
            question.typeLongText = true;
        };
        if(question.type == "dropdown"){
            question.typeDropDown = true;
        };
        if(question.type == "combo"){
            question.typeCombo= true;
            fields = question.fields;
            for(i = 0; i < fields.length; i++){
                if(fields[i].type == "blank"){
                    fields[i].typeBlank = true;
                };
                if(fields[i].type == "longtext"){
                    fields[i].typeLongText = true;
                };
                if(fields[i].type == "multiChoice"){
                    fields[i].typeMultiChoice = true;
                    for(j = 0; j < fields[i].answers.length; j++){
                        fields[i].answers[j].group = i;
                    }
                };
                
            }
        };
        t.questionType.set(question.type);
        question.length = question.length;
        if(!question.imgStyle){
            question.imgStyle = "max-width:50%; height:auto; margin:10px;";
        }
        return question;
    },
});

Template.module.events({
    'keypress #response' : function(event){
        event.preventDefault();
        if (event.keyCode === 13) {
            $(".continue").click();
        } else {
            value = $('#response').val();
            value += String.fromCharCode(event.keyCode);
            value = $('#response').val(value);
        }
    },
    'mouseover .multichoice': function(event){
        response = $(event.target).html();
        curModule = Modules.findOne();
        const t = Template.instance();
        if(curModule.autoTutorReadsResponse && response){
            readTTS(t, response);
         }
    },
    'click .continue, response': async function(event) {
        $(':button').prop('disabled', true); 
        const t = Template.instance();
        event.preventDefault();
        curModule = Modules.findOne()
        target = "";
        moduleId = Meteor.user().curModule.moduleId;
        moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.lastAccessed = Date.now().toString();
        thisPage = Meteor.user().curModule.pageId;
        thisQuestion = Meteor.user().curModule.questionId;
        if(t.pageType.get() == "activity"){
            questionData = {};
            questionData.questionType = t.questionType.get();
            if(questionData.questionType == "blank"){
                response = $('.textInput').val();
                answerValue = parseInt($(event.target).val());
            }
            if(questionData.questionType == "multiChoice"){
                response = $(event.target).html();
                answerValue = parseInt($(event.target).val());
            }
            if(questionData.questionType == "longText"){
                response = $('.textareaInput').val();
            }
            if(questionData.questionType == "combo"){
                allInput = document.getElementsByClassName('combo');
                response = [];
                for(i = 0; i < allInput.length; i++){
                    if ($(allInput[i]).prop('nodeName') == "INPUT" || $(allInput[i]).prop('nodeName') == "TEXTAREA"){
                        response.push($(allInput[i]).val());
                    }
                    if ($(allInput[i]).hasClass('btn-info')){
                        response.push($(allInput[i]).html());
                    }
                }
            }
            data = {
                questionType: t.questionType.get(),
                pageId: thisPage,
                questionId: thisQuestion,
                response: response,
                responseTimeStamp: Date.now().toString()
            }
            if(curModule.autoTutorReadsResponse && response){
                readTTS(t, response);
             }
            moduleData.responses.push(data);
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = thisQuestion + 1;
            Meteor.call("saveModuleData", moduleData, curModule._id , thisPage, thisQuestion, response, answerValue, function(err, res){
                feedback = t.feedback.get();
                type = "danger"
                message = question.incorrectFeedback || "Incorrect."
                if(res != "disabled"){
                    if(res == true){ 
                        type = "success";
                        message = "Correct!";
                    } 
                    addedClass = 'alert-' + type;
                    $('#refutation').addClass(addedClass);
                    $('#refutation').text(message);
                    $('#refutation').show();
                    if(curModule.autoTutorReadsRefutation){
                        readTTS(t, message);
                    }
                }
            });
            timeOut = curModule.feedbackTimeout * 1000 || 5000;
            await sleep(timeOut);
            $('#refutation').removeClass('alert-success');
            $('#refutation').removeClass('alert-danger');
            $('#refutation').text("");
            $('#refutation').hide();
            $(':button').prop('disabled', false); 
            $(':button').removeClass('btn-info');
            moduleData = ModuleResults.findOne({_id: moduleId});
            if(!curModule.enableAdaptivePages && curModule.pages[thisPage].nextFlow.length == 0){
                nextQuestion = thisQuestion + 1;
                nextQuestionData = curModule.pages[thisPage].questions[nextQuestion];
                console.log(thisPage, nextQuestion, nextQuestionData);
                if(typeof nextQuestionData !== "undefined"){
                    target = "/module/" + curModule._id + "/" + thisPage + "/" + nextQuestion; 
                } else {
                    nextPage = thisPage + 1;
                    if(typeof curModule.pages[nextPage] !== "undefined"){
                        target = "/module/" + curModule._id + "/" + nextPage; 
                    } else {
                        target = "/module/" + curModule._id + "/completed"; 
                    }
                }
            } else {
                conditions = curModule.pages[thisPage].nextFlow;
                routePicked = false;
                for(i = 0; i < conditions.length; i++){
                    if(!routePicked){
                        conditionStatement = "moduleData." + conditions[i].condition + conditions[i].operand + conditions[i].threshold;
                        conditionState = eval(conditionStatement);
                        if(conditionState){
                            target = "/module/" + curModule._id + "/" + condition.route; 
                            routePicked = true;
                        }
                    }
                }
                if(!routePicked){
                    routing = curModule.fallbackRoute
                    if(routing == 'nextPage'){
                        moduleData.nextPage = thisPage + 1;
                        if(typeof curModule.pages[nextPage] !== "undefined"){
                            moduleData.nextQuestion = 0;
                            routePicked = true;
                            target = "/module/" + curModule._id + "/" + moduleData.nextPage;
                        } else {
                            target = "/module/" + curModule._id + "/completed";
                        }
                    } 
                    if(routing == 'currentPage'){
                        moduleData.nextPage = thisPage;
                        moduleData.nextQuestion = 0;
                        routePicked = true;
                        target = "/module/" + curModule._id + "/" + thisPage;
                    }
                  
                    if(routing == 'completed'){
                        moduleData.nextPage = "completed";
                        moduleData.nextQuestion =  "completed";
                        routePicked = true;
                        target = "/module/" + curModule._id + "/completed";
                    }
                    if(routing == 'error'){
                        alert("Something went wrong. No routing found.");
                        moduleData.nextPage = "error";
                        moduleData.nextQuestion =  "error";
                        routePicked = true;
                        target = "/moduleCenter";
                    }
                }
            }
        }
        console.log("ROUTE:", target);
        window.location.href = target;
    },
    'click #startActivity': function(event){
        target =  $(location).attr('href') + "/0";
        window.location.href = target;
    },
    'click .multichoice': function(event){
        event.preventDefault();
        const collection = document.getElementsByClassName("multichoice");
        for (let i = 0; i < collection.length; i++){
            if(collection[i].dataset.group == $(event.target).data("group")){
                collection[i].classList.remove("btn-info");
            }
        }
        event.target.classList.toggle('btn-info');
    },
    'click #startModule': function(event){
        event.preventDefault();
        data = {
            userId: Meteor.userId(),
            moduleId: Modules.findOne()._id, 
            responses: []
        }
        Meteor.call("createNewModuleTrial", data);
        target = "/module/" + Modules.findOne()._id + "/0";
        window.location.href = target;
    },
    'click #goBack': function(event){
        target = "/profile/"
        window.location.href=target;
    }
})
Template.module.onCreated(function(){
    params = Router.current().params;
    Meteor.subscribe('curModule', params.moduleId);
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.statsData = new ReactiveVar({});
    this.promptRead = new ReactiveVar(false);
    this.audioActive = new ReactiveVar(false);
    this.TTSQueue = new ReactiveVar([]);
})
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function readTTS(template, message){
    let moduleId =  Modules.findOne()._id;
    let audioActive = template.audioActive.get();
    let TTSQueue = template.TTSQueue.get();
    Meteor.call('makeGoogleTTSApiCall', message, moduleId, function(err, res) {
        if(err){
            console.log("Something went wrong with TTS, ", err)
        }
        if(res != undefined){
            TTSQueue.push(res);
            if(!audioActive){
                playAudio(template);
            }
        }
    });
}

function playAudio(template){
    template.audioActive.set(true);
    let TTSQueue = template.TTSQueue.get();
    const audioObj = new Audio('data:audio/ogg;base64,' + TTSQueue.shift());
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        if(TTSQueue.length > 0){
            playAudio(template);
        }
        else{
            template.audioActive.set(false);
        }
    });
    window.currentAudioObj.play();
}

