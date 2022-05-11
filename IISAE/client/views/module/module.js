import hark from 'hark';
import { FilesCollection } from 'meteor/ostrio:files';
import FileReader from 'filereader';

var chunks = [];

Template.module.onRendered(function (){
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
    autoTutorReadsPrompt = moduleData.autoTutorReadsPrompt;
    promptToRead = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].prompt;
    if(autoTutorReadsPrompt && promptToRead){
        readTTS(t, promptToRead);
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
        question.audioRecording = curModule.audioRecording;
        if(question.type == "blank"){
            question.typeBlank = true;
        };
        if(question.type == "multiChoice"){
            question.typeMultiChoice = true;
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
            readTTS(t, response);
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
        answerValue = 0;
        transcript = t.transcript.get();
        $('#audioRecordingNotice').html("Waiting for AutoTutor to finish.");
        if(t.pageType.get() == "activity"){
            if(transcript == "" || !transcript){
                questionData = {};
                if(curModule.audioRecording){
                    questionData.audioRecorded = chunks;

                }
                if(questionData.questionType == "blank"){
                    response = $('.textInput').val();
                    answerValue = parseInt($(event.target).getAttr('value'));
                }
                if(questionData.questionType == "multiChoice"){
                    response = $(event.target).html();
                    answerValue = parseInt($(event.target).getAttr('value'));
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
                readTTS(t, response);
             }
            moduleData.responses[moduleData.responses.length - 1]=data;
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
    }
})
Template.module.onCreated(function(){
    params = Router.current().params;
    Meteor.subscribe('curModule', params.moduleId);
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.statsData = new ReactiveVar({});
    this.audioActive = new ReactiveVar(false);
    this.TTSQueue = new ReactiveVar([]);
    this.audioToSave = new ReactiveVar("");
    this.transcript = new ReactiveVar("");
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

async function playAudio(template){
    template.audioActive.set(true);
    let TTSQueue = template.TTSQueue.get();
    const audioObj = new Audio('data:audio/ogg;base64,' + TTSQueue.shift());
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        if(TTSQueue.length > 0){
            playAudio(template);
        }
        else{
            sleep(1000).then(function(){
                template.audioActive.set(false);
                $('#audioRecordingNotice').html("I am listening.");
                $('#audiovis').show();
                moduleData = Modules.findOne({});
                if(moduleData.audioRecording){
                    setupRecording(template);
                }
                }
            );
        }
    });
    window.currentAudioObj.play();
}
function setupRecording(template){
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

