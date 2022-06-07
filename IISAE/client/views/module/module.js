import hark from 'hark';
import { FilesCollection } from 'meteor/ostrio:files';
import FileReader from 'filereader';


var chunks = [];

Template.module.onRendered(function (){
    $('#scrollArea').scroll(function(){
        element = document.getElementById('scrollArea');
        if(Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) === 0){
            console.log('enable');
            $(".continue").prop( "disabled", false );
        }
    });
    $('#visualizer').hide();
    moduleData = Modules.findOne();
    let moduleId = Meteor.user().curModule.moduleId;
    moduleResults = ModuleResults.findOne({_id: moduleId});
    data = {
        pageRendered: Date.now()
    }
    moduleResults.responses.push(data);
    Meteor.call('initiateNewResponse',moduleResults);
    const t = Template.instance();
    autoTutorReadsPrompt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts);
    autoTutorPromptCharacterVoice = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).voice;
    autoTutorPromptCharacterName = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).name;
    art = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).art;
    autoTutorReadsScript = moduleData.autoTutorReadsScript;
    console.log(moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId], Meteor.user().curModule.pageId,Meteor.user().curModule.questionId);
    promptToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt || false;
    scriptsToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].autoTutorScript || [];
    if(autoTutorReadsScript && scriptsToRead.length > 0){
        for(let scriptIndex in scriptsToRead){
            script = scriptsToRead[scriptIndex];
            scriptToAdd = ""
            character = script.character;
            voice = moduleData.autoTutorCharacter.find(o => o.name == script.character).voice;
            art = moduleData.autoTutorCharacter.find(o => o.name == script.character).art;
            if(moduleData.enableAnswerTags){
                if(typeof moduleResults.answerTags !== "undefined"){
                    for(let keys of Object.keys(moduleResults.answerTags)){
                        pattern = "<(" + keys + ")>"
                        regex = new RegExp(pattern)
                        scriptToAdd = script.script.replace(regex,moduleResults.answerTags[keys]);
                    }
                    readTTS(t,scriptToAdd,voice,character, art);
                } else {
                    readTTS(t,script.script,voice,character, art);
                }
            } else {
                readTTS(t,script.script,voice,character, art);
            }
        }
    }
    questionPrompt = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt;
    if(moduleData.enableAnswerTags){
        if(typeof moduleResults.answerTags !== "undefined"){
            for(let keys of Object.keys(moduleResults.answerTags)){
                pattern = "<(" + keys + ")>"
                regex = new RegExp(pattern)
                promptToRead = questionPrompt.replace(regex,moduleResults.answerTags[keys]);
            }
        }
     }
    if(autoTutorReadsPrompt && promptToRead){
        readTTS(t, promptToRead, autoTutorPromptCharacterVoice,autoTutorPromptCharacterName, art);
    } 
    if(moduleData.audioRecording && !moduleData.enableAutoTutor){
        setupRecording(t);
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
            if(page.type == "embed"){
                page.typeEmbed = true;
                t.pageType.set("typeEmbed");
            };
            if(!page.imgStyle){
                page.imgStyle = "max-width:50%; height:auto; margin:10px;"
            }
        }
        return page;
    },
    'question': function(){
        curModule = Modules.findOne();
        moduleId = Meteor.user().curModule.moduleId;
        moduleData = ModuleResults.findOne({_id: moduleId});
        autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
        page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        const t = Template.instance();
        question.audioRecording = curModule.audioRecording;
        if(question.type == "blank"){
            question.typeBlank = true;
        };
        if(question.type == "scrollbar"){
            question.typeScroll = true;
        };
        if(question.type == "autotutorscript"){
            question.typeATScript = true;
        }
        if(question.type == "link"){
            question.typeLink = true;
            console.log('hi');
            b = question.prompt.replace(/<a>/gm,"<a id='continueLink'>");
            question.prompt = b;
            console.log(question.prompt);
        };
        if(question.type == "multiChoice"){
            question.typeMultiChoice = true;
        };
        if(question.type == "html"){
            question.typeHTML = true;
        };
        if(question.type == "video"){
            question.typeVideo = true;
        };
        if(question.type == "longtext"){
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
        if(curModule.enableAnswerTags){
           if(typeof moduleData.answerTags !== "undefined"){
               for(let keys of Object.keys(moduleData.answerTags)){
                   pattern = "<(" + keys + ")>"
                   regex = new RegExp(pattern)
                   question.prompt = question.prompt.replace(regex,moduleData.answerTags[keys]);
               }
           }
        }
        return question;
    },
    'transcript': function(){
        let moduleId = Meteor.user().curModule.moduleId;
        results = ModuleResults.findOne({_id: moduleId});
        if(results.responses[results.responses.length - 1].transcription !== false){
            transcript = results.responses[results.responses.length - 1].transcription[0].alternatives[0].transcript;
            if(transcript != "" || typeof transcript !== "undefined"){
                const t = Template.instance();
                t.transcript.set(transcript);
                $(".continue").click();
            }
            return transcript;
        }
    }
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
            autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
            autoTutorPromptCharacterVoice = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts).voice;
            readTTS(t, response, autoTutorPromptCharacterVoice);
         }
    },
    'click .btn-repeat': function (event){
        moduleData = Modules.findOne();
        let moduleId = Meteor.user().curModule.moduleId;
        moduleResults = ModuleResults.findOne({_id: moduleId});
        const t = Template.instance();
        autoTutorReadsPrompt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts);
        autoTutorPromptCharacterVoice = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).voice;
        autoTutorPromptCharacterName = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).name;
        art = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).art;
        autoTutorReadsScript = moduleData.autoTutorReadsScript;
        promptToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt || false;
        scriptsToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].autoTutorScript || [];
        if(autoTutorReadsScript && scriptsToRead.length > 0){
            for(let scriptIndex in scriptsToRead){
                script = scriptsToRead[scriptIndex];
                scriptToAdd = ""
                character = script.character;
                voice = moduleData.autoTutorCharacter.find(o => o.name == script.character).voice;
                art = moduleData.autoTutorCharacter.find(o => o.name == script.character).art;
                if(moduleData.enableAnswerTags){
                    if(typeof moduleResults.answerTags !== "undefined"){
                        for(let keys of Object.keys(moduleResults.answerTags)){
                            pattern = "<(" + keys + ")>"
                            regex = new RegExp(pattern)
                            scriptToAdd = script.script.replace(regex,moduleResults.answerTags[keys]);
                        }
                        readTTS(t,scriptToAdd,voice,character, art);
                    } else {
                        readTTS(t,script.script,voice,character, art);
                    }
                } else {
                    readTTS(t,script.script,voice,character, art);
                }
            }
        }
        questionPrompt = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt;
        if(moduleData.enableAnswerTags){
            if(typeof moduleResults.answerTags !== "undefined"){
                for(let keys of Object.keys(moduleResults.answerTags)){
                    pattern = "<(" + keys + ")>"
                    regex = new RegExp(pattern)
                    promptToRead = questionPrompt.replace(regex,moduleResults.answerTags[keys]);
                }
            }
         }
        if(autoTutorReadsPrompt && promptToRead){
            readTTS(t, promptToRead, autoTutorPromptCharacterVoice,autoTutorPromptCharacterName, art);
        } 
        if(moduleData.audioRecording && !moduleData.enableAutoTutor){
            setupRecording(t);
        }

    },
    'click .continue': async function(event) {
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
        thisQuestionData = curModule.pages[thisPage].questions[thisQuestion]
        answerValue = 0;
        transcript = t.transcript.get() || "";
        $('#audioRecordingNotice').html("Waiting for AutoTutor to finish.");
        if(t.pageType.get() == "activity"){
            if(transcript == "" || !transcript){
                questionData = curModule.pages[thisPage].questions[thisQuestion];
                if(curModule.audioRecording){
                    questionData.audioRecorded = chunks;

                }
                if(questionData.type == "blank"){
                    response = $(".textInput").val();
                    answerValue = parseInt($(event.target).val());
                }
                if(questionData.type == "autotutorscript"){
                    response = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "video"){
                    response = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "html"){
                    response = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "scrollbar"){
                    response = thisQuestion.correctAnswer || true;
                    answerValue = answerValue;
                }
                if(questionData.type == "link"){
                    response = thisQuestion.correctAnswer || true;
                    answerValue = answerValue;
                }
                if(questionData.type == "multiChoice"){
                    response = $(event.target).html();
                    answerValue = parseInt($(event.target).val());
                    index = event.target.getAttribute('id');
                    console.log(thisQuestion, index)
                    if(thisQuestionData.answers[index].feedback != "" || typeof thisQuestionData.answers[index].feedback != "undefined"){
                        refutation = thisQuestionData.answers[index].feedback;
                    }
                }
                if(questionData.type == "longtext"){
                    response = $('.textareaInput').val();
                }
                if(questionData.type == "combo"){
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
            } else {
                response = transcript;
                answerValue = 1;
            }
            data = moduleData.responses[moduleData.responses.length - 1];
            data.questionType = t.questionType.get();
            data.pageId =  thisPage;
            data.questionId = thisQuestion;
            data.response =  response;
            data.responseTimeStamp = Date.now().toString();
            if(curModule.autoTutorReadsResponse && response){
                autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                autoTutorPromptCharacterVoice = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts).voice;
                readTTS(t, response);
             }
            moduleData.responses[moduleData.responses.length - 1]=data;
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = thisQuestion + 1;
            console.log(response);
            Meteor.call("saveModuleData", moduleData, curModule._id , thisPage, thisQuestion, response, answerValue, function(err, res){
                feedback = t.feedback.get();
                type = "danger"
                message = refutation || question.incorrectFeedback || "Incorrect."
                if(res != "disabled"){
                    if(res == true){ 
                        type = "success";
                        message = refutation || "Correct!";
                    } 
                    addedClass = 'alert-' + type;
                    $('#refutation').addClass(addedClass);
                    $('#refutation').text(message);
                    $('#refutation').show();
                    if(curModule.autoTutorReadsRefutation){
                        autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                        autoTutorCharacter = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts);
                        readTTS(t, message, autoTutorCharacter.voice, autoTutorCharacter.name, autoTutorCharacter.art);
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
            if(!curModule.enableAdaptivePages || curModule.pages[thisPage].questions.length > thisQuestion + 1){
                nextQuestion = thisQuestion + 1;
                nextQuestionData = curModule.pages[thisPage].questions[nextQuestion];
                if(typeof nextQuestionData !== "undefined"){
                    target = "/module/" + curModule._id + "/" + thisPage + "/" + nextQuestion; 
                } else {
                    nextPage = thisPage + 1;
                    if(typeof curModule.pages[nextPage] !== "undefined"){
                        if(curModule.pages[nextPage].type="activity" && curModule.skipInterstitials){
                            target = "/module/" + curModule._id + "/" + nextPage + "/0"; 
                        } else {
                            target = "/module/" + curModule._id + "/" + nextPage; 
                        }
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
                            if(curModule.pages[conditions[i].route].type="activity" && curModule.skipInterstitials){
                                target = "/module/" + curModule._id + "/" + conditions[i].route + "/0"; 
                            } else {
                                target = "/module/" + curModule._id + "/" + conditions[i].route; 
                            }
                            routePicked = true;
                            moduleData.nextPage = conditions[i].route;
                            moduleData.nextQuestion = 0;
                            console.log(conditions[i].clearScoring);
                            if(conditions[i].clearScoring){
                                moduleData.score = 0;
                            }
                            Meteor.call("overrideUserDataRoutes",moduleData); 
                        }
                    }
                }
                if(!routePicked){
                    routing = curModule.fallbackRoute
                    if(routing == 'nextPage'){
                        moduleData.nextPage = thisPage + 1;
                        if(typeof curModule.pages[thisPage + 1] !== "undefined"){
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
                    Meteor.call("overrideUserDataRoutes",moduleData); 
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
        const t = Template.instance();
        transcript.transcript.get();
        if(transcript = "" || !transcript){
            const collection = document.getElementsByClassName("multichoice");
            for (let i = 0; i < collection.length; i++){
                if(collection[i].dataset.group == $(event.target).data("group")){
                    collection[i].classList.remove("btn-info");
                }
            }
            event.target.classList.toggle('btn-info');
        }
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
    },
    'click #continueLink': function(){
        $(".continue").prop( "disabled", false );
    }
})
Template.module.onCreated(function(){
    params = Router.current().params;
    console.log(params);
    Meteor.subscribe('curModule', params._id);
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.statsData = new ReactiveVar({});
    this.audioActive = new ReactiveVar(false);
    this.audioObjects = new ReactiveVar([]);
    this.audioToSave = new ReactiveVar("");
    this.transcript = new ReactiveVar("");
    this.TTSTracPlaying = new ReactiveVar(0);
})
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function readTTS(template, message, voice, character,characterArt){
    console.log(character);
    let moduleId =  Modules.findOne()._id;
    let audioActive = template.audioActive.get();
    template.audioActive.set(true);
    let displayMessage = character + ": " + message;
    let audioObj = new Audio();
    let audioObjects = template.audioObjects.get();
    audioObjects.push({obj:audioObj, art:characterArt, character:character, displayMessage:displayMessage});
    let order = audioObjects.length;
    template.audioObjects.set(audioObjects);
    Meteor.call('makeGoogleTTSApiCall', message, moduleId, voice, function(err, res) {
        if(err){
            console.log("Something went wrong with TTS, ", err)
        }
        if(res != undefined){
            let audioObjects = template.audioObjects.get();
            console.log(order, audioObjects[order]);
            audioObjects[order - 1].obj.src = "data:audio/ogg;base64," + res;
            template.audioObjects.set(audioObjects)
            if(!audioActive){
                $(':button').prop('disabled', true); 
                $(':button').prop('hidden', true); 
                template.audioActive.set(true);
                playAudio(template);
            }
        }
    });
}

async function playAudio(template){
    let TTSTracPlaying = template.TTSTracPlaying.get();
    let audioObjs = template.audioObjects.get();
    const audioObj = audioObjs[TTSTracPlaying].obj;
    console.log(audioObjs);
    $('#script').html(audioObjs[TTSTracPlaying].displayMessage);
    $('#script').prop('hidden', false);
    $('#currentAvatar').html("<img src='" + audioObjs[TTSTracPlaying].art + "' style='max-width:100%; padding=20px;'><br>");
    console.log(TTSTracPlaying, "of" , audioObjs.length) - 1;
    template.TTSTracPlaying.set(TTSTracPlaying + 1);
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        TTSTracPlaying++;
        template.TTSTracPlaying.set(TTSTracPlaying);
        if(audioObjs.length > TTSTracPlaying){
            sleep(1000).then(function(){
                playAudio(template);
            });
        }
        else{
            sleep(1000).then(function(){
                questionType = template.questionType.get();
                console.log(questionType);
                template.audioActive.set(false);
                $('#audioRecordingNotice').html("I am listening.");
                
                $('#audiovis').show();
                moduleData = Modules.findOne({});
                if(moduleData.audioRecording){
                    setupRecording(template);
                }
                questionType = template.questionType.get();
                if(questionType == "video" || questionType == "link" || questionType == "scrollbar"){
                    console.log("test");
                    $(':button').prop('disabled', true); 
                    $(':button').prop('hidden', true); 
                } else {
                    $(':button').prop('disabled', false); 
                    $(':button').prop('hidden', false); 
                }
                if(questionType == "autotutorscript"){
                    $('.continue').click();
                }
                }
            );
        }
    });
    window.currentAudioObj.play();
}
function setupRecording(template){
    console.log("Setting up audio");
    /// Setup Audio Recording
    template = template;
    navigator.getUserMedia({ audio : true}, onMediaSuccess, function(){});
  
    function onMediaSuccess(stream) {
      visualize(stream);
      var options = {};
      var speechEvents = hark(stream, options);
      var recorder = new MediaRecorder(stream);
      console.log("recording");
      recorder.start();



        recorder.ondataavailable = function(event) {
            console.log(template.feedback.get());
            if (event.data.size > 0 && template.feedback.get() == false) {
                chunks = [event.data];
                processAudio(chunks);
            } else {
                $('#audioRecordingNotice').html("I am waiting for AutoTutor to finish.");
            }
        }

        async function processAudio(chunks) {
            $('#audiovis').hide();
            var blob = new Blob(chunks, {
              type: "audio/webm"
            });
            fileName = "responseAudio_" + Meteor.userId() + "_" +  Meteor.user().curModule.moduleId + "_" + Date.now() + ".webm";
            blob.arrayBuffer().then((arrayBuffer) => {
                let moduleId = Meteor.user().curModule.moduleId;
                var Buffer = require('buffer').Buffer;
                const buffer=Buffer.from(arrayBuffer,'binary');
                Meteor.call('processAudio',buffer,fileName, moduleId, function(err,res){

          
            });
            results = ModuleResults.findOne({_id: moduleId});
            if(!results.responses[results.responses.length - 1].transcription){
                $('#audioRecordingNotice').html("I am listening.");
                $('#audiovis').show();
            } else {
                recorder.stop();
                transcript = results.responses[results.responses.length - 1].transcription[0].alternatives[0].transcript;
                if(transcript != "" || typeof transcript !== "undefined"){
                    stream.getTracks() // get all tracks from the MediaStream
                    forEach( track => track.stop() ); // stop each of them
                }
            }
        })
    }

  
      speechEvents.on('stopped_speaking', function() {
           console.log('stopped_speaking');
           if(recorder.state == "recording"){
            recorder.stop();
            $('#audioRecordingNotice').html("I am thinking.");
           }
      });
    };
}
function visualize(stream){
    const visualizer = document.getElementById("audiovis");
    visualizer.height = 25;
    visualizer.width = 200;
    const canvasCtx = visualizer.getContext("2d");
    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    source.connect(analyser);
    drawVis();
    function drawVis(){
        WIDTH = visualizer.width;
        HEIGHT = visualizer.height;
        requestAnimationFrame(drawVis);
        analyser.getByteTimeDomainData(dataArray);
        canvasCtx.fillStyle = "#ffffff";
        canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
        canvasCtx.lineWidth = 1;
        canvasCtx.strokeStyle = "#4287f5";
        canvasCtx.beginPath();
        let sliceWidth = (WIDTH * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = (v * HEIGHT) / 2;

            if (i === 0) {
                canvasCtx.moveTo(x, y);
            } else {
                canvasCtx.lineTo(x, y);
            }

            x += sliceWidth;
        }
        canvasCtx.lineTo(visualizer.width, visualizer.height / 2);
        canvasCtx.stroke();

    }
}
