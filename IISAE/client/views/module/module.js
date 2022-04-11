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
            return page;
        }
    },
    'question': function(){
        autoTutorReadsPrompt = Modules.findOne().autoTutorReadsPrompt;
        page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        const t = Template.instance();
        promptRead = t.promptRead.get();
        if(autoTutorReadsPrompt && question.prompt && promptRead == 1){
            readTTS(question.prompt);
            t.promptRead.set(2);
        } else {
            promptRead++;
            t.promptRead.set(promptRead);
        }
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
    'click .continue, response': async function(event) {
        $(':button').prop('disabled', true); 
        const t = Template.instance();
        event.preventDefault();
        curModule = Modules.findOne()
        let target = "";
        let moduleId = Meteor.user().curModule.moduleId;
        let moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.lastAccessed = Date.now().toString();
        let thisPage = Meteor.user().curModule.pageId;
        let userId = Meteor.userId();
        let user = Meteor.users.findOne({_id: userId});
        let thisQuestion = parseInt(Meteor.user().curModule.questionId);
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
               readTTS(response);
            }
            moduleData.responses.push(data);
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = parseInt(thisQuestion) + 1;
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
                        readTTS(message);
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
            if(typeof Modules.findOne().pages[moduleData.nextPage] !== "undefined"){
              if(typeof Modules.findOne().pages[moduleData.nextPage].questions !== "undefined"){
                  if(moduleData.nextQuestion >= Modules.findOne().pages[moduleData.nextPage].questions.length){
                      if(!curModule.enableAdaptivePages && Modules.findOne().pages[thisPage].nextFlow.length > 0){
                          moduleData.nextPage = thisPage + 1;
                          moduleData.nextQuestion = 0;
                          target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
                      } else {
                          conditions = Modules.findOne().pages[thisPage].nextFlow;
                          conditionMet = false;
                          for(i = 0; i < conditions.length && !conditionMet ; i++){
                              curCondition = conditions[i];
                              if(curCondition.condition !== "static"){
                                text = "moduleData." + curCondition.condition + curCondition.operand + curCondition.threshold;
                                isConditionTrue = eval(text);
                                variableStatus = eval("moduleData." + curCondition.condition);
                                if(isConditionTrue && !conditionMet){
                                    moduleData.nextPage=curCondition.route;
                                    moduleData.nextQuestion=0;
                                    target = "/module/" + Modules.findOne()._id + "/" + curCondition.route;
                                    conditionMet = true;
                                        console.log('clear score');
                                        moduleData.score = 0;
                                    }
                                } else {
                                target = "/module/" + Modules.findOne()._id + "/" + curCondition.route;
                                if(curCondition.clearScoring){
                                    console.log('clear score');
                                    moduleData.score = 0;
                                }
                            }
                          }
                          if(!conditionMet){
                            routing = curModule.fallbackRoute
                            if(routing == 'nextPage'){
                                moduleData.nextPage = thisPage + 1;
                                moduleData.nextQuestion = 0;
                                target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
                            } 
                            if(routing == 'currentPage'){
                                moduleData.nextPage = thisPage;
                                moduleData.nextQuestion = 0;
                                target = "/module/" + Modules.findOne()._id + "/" + thisPage;
                            }

                            if(routing == 'completed'){
                                moduleData.nextPage = "completed";
                                moduleData.nextQuestion =  "completed";
                                target = "/module/" + Modules.findOne()._id + "/completed";
                            }
                            if(routing == 'error'){
                                alert("Something went wrong. No routing found.");
                                moduleData.nextPage = "error";
                                moduleData.nextQuestion =  "error";
                                target = "/moduleCenter";
                            }
                          }
                        Meteor.call("overrideUserDataRoutes", moduleData);
                      }
                  } else  {
                      moduleData.nextQuestion = thisQuestion + 1;
                      target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage + "/" + moduleData.nextQuestion;
                      
                      
                  }
               }
          }
        } else {
            if(!curModule.enableAdaptivePages && Modules.findOne().pages[thisPage].nextFlow.length > 0){
                moduleData.nextPage = parseInt(thisPage) + 1;
                moduleData.nextQuestion = 0;
                data = {
                    pageId: thisPage,
                    response: "read",
                    responseTimeStamp: Date.now().toString()
                }
                Meteor.call("overrideUserDataRoutes", moduleData);
                target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
            } else {
                conditions = Modules.findOne().pages[thisPage].nextFlow;
                conditionMet = false;
                for(i = 0; i < conditions.length && !conditionMet ; i++){
                    curCondition = conditions[i];
                    if(curCondition.condition !== "static"){
                      text = "moduleData." + curCondition.condition + curCondition.operand + curCondition.threshold;
                      isConditionTrue = eval(text);
                      variableStatus = eval("moduleData." + curCondition.condition);
                      if(isConditionTrue && !conditionMet){
                          moduleData.nextPage=curCondition.route;
                          moduleData.nextQuestion=0;
                          target = "/module/" + Modules.findOne()._id + "/" + curCondition.route;
                          conditionMet = true;
                              moduleData.score = 0;
                          }
                      } else {
                      target = "/module/" + Modules.findOne()._id + "/" + curCondition.route;
                      if(curCondition.clearScoring){
                          moduleData.score = 0;
                      }
                  }
                }
                if(!conditionMet){
                  routing = curModule.fallbackRoute
                  if(routing == 'nextPage'){
                      moduleData.nextPage = thisPage + 1;
                      moduleData.nextQuestion = 0;
                      target = "/module/" + Modules.findOne()._id + "/" + moduleData.nextPage;
                  } 
                  if(routing == 'currentPage'){
                      moduleData.nextPage = thisPage;
                      moduleData.nextQuestion = 0;
                      target = "/module/" + Modules.findOne()._id + "/" + thisPage;
                  }

                  if(routing == 'completed'){
                      moduleData.nextPage = "completed";
                      moduleData.nextQuestion =  "completed";
                      target = "/module/" + Modules.findOne()._id + "/completed";
                  }
                  if(routing == 'error'){
                      alert("Something went wrong. No routing found.");
                      moduleData.nextPage = "error";
                      moduleData.nextQuestion =  "error";
                      target = "/moduleCenter";
                  }
                }
              Meteor.call("overrideUserDataRoutes", moduleData);
            }
            
        }
        if(moduleData.nextPage >= Modules.findOne().pages.length){
            moduleData.nextPage = "completed";
            moduleData.nextQuestion = "completed";
            user = Meteor.user();
            index = user.assigned.findIndex(x => x.assignmentId === moduleId);
            if(index != -1){
                user.assigned.splice(index, 1);
            }
            user.assigned.splice(index, 1);
            Meteor.call('changeAssignmentOneUser', [Meteor.userId(), user.assigned]);
            Meteor.call("saveModuleData", moduleData);
            target = "/module/" + Modules.findOne()._id + "/completed";
        } 
        t.promptRead.set(0);
        console.log("ROUTE:", target);
        Router.go(target);
    },
    'click #startActivity': function(event){
        target =  $(location).attr('href') + "/0";
        Router.go(target);
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
        Router.go(target);
    },
    'click #goBack': function(event){
        target = "/profile/"
        Router.go(target);
    }
})
Template.module.onCreated(function(){
    params = Router.current().params;
    Meteor.subscribe('curModule', params.moduleId);
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.pageId = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.statsData = new ReactiveVar({});
    this.promptRead = new ReactiveVar(0);
    this.audioActive = new ReactiveVar(false);
})
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function readTTS(message){
    let moduleId =  Modules.findOne()._id;
    let text = message;
    let audioPromptSpeakingRate = 1
    let audioVolume = .5
    Meteor.call('makeGoogleTTSApiCall', text, audioPromptSpeakingRate, audioVolume, moduleId, function(err, res) {
        if(err){
            console.log("Something went wrong with TTS, ", err)
        }
        if(res != undefined){
            const audioObj = new Audio('data:audio/ogg;base64,' + res)
            window.currentAudioObj = audioObj;
            audioObj.addEventListener('ended', function(){
                audioActive = false;
            })
            audioObj.play();
        }
    });

}

