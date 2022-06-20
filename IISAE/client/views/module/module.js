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
    if(autoTutorReadsScript && scriptsToRead.length > 0 && typeof moduleResults.questionBoardAnswered == 'undefined'){
        for(let scriptIndex in scriptsToRead){
            script = scriptsToRead[scriptIndex];
            if(script.scriptAlt)
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
                    for(let keys of Object.keys(moduleResults.answerTags)){
                        pattern = "<(" + keys + ")>"
                        regex = new RegExp(pattern)
                        scriptToAdd = script.scriptAlt.replace(regex,moduleResults.answerTags[keys]);
                    }
                    readTTS(t,scriptToAdd,voice,character, art, script.scriptAlt);
                } else {
                    readTTS(t,script.script,voice,character, art, script.scriptAlt);
                }
            } else {
                readTTS(t,script.script,voice,character, art, script.scriptAlt);
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
        console.log(question.type);
        if(question.type == "blank"){
            question.typeBlank = true;
        };
        if(question.type == "questionSelectionBoard"){
            question.typeQuestionSelectBoard = true;
            questionsAvailable = page.questions;
            question.currentScore = moduleData.questionBoardScore || 0;
            scoreWidth = (question.currentScore / parseInt(question.goalScore)) * 100 + "%" || "5%";
            if(scoreWidth == "100%"){
                $(".selectionboard").prop("disabled",true);
                $(".continue").prop("disabled",false);
            }
            $('.scorebar').width(scoreWidth);
            console.log(questionsAvailable);
            for(index in questionsAvailable){
                questionsAvailable[index].index = parseInt(index);
            }
            console.log(moduleData.questionBoardAnswered);
            if(moduleData.questionBoardAnswered){
                console.log("questions already answered");
                for(questionIndex of moduleData.questionBoardAnswered){
                    console.log("Question answered",questionIndex, typeof questionIndex);
                    questionIndex = parseInt(questionIndex);
                    let findIndex = questionsAvailable.map(e => e.index).indexOf(questionIndex);
                    console.log("Found Index ", findIndex);
                    questionsAvailable.splice(findIndex, 1);
                }
            }
            questionsAvailable.shift()
            let shuffled = questionsAvailable
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)
            question.availableQuestions = shuffled;
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
            if(curModule.randomChoice){
                let shuffled = question.answers
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)
                question.answers = shuffled;
            }
        };
        if(question.type == "reading"){
            question.typeReading = true;
            question.curPassageNumber = t.curReadingPage.get();
            question.curPassage = question.passages[question.curPassageNumber].text;
            if(page.questions.length == question.curPassageNumber){
                $('.readingLastPage').prop("disabled",true);
                $('.readingNextPage').prop("disabled",true);
                $('.readingPrevPage').prop("disabled",false);
                $('.contine').prop("disabled",false);
            } 
            if(question.curPassageNumber == 0){
                $('.readingLastPage').prop("disabled",false);
                $('.readingNextPage').prop("disabled",false);
                $('.readingPrevPage').prop("disabled",true);
            } 

        };
        if(question.type == "wordbank"){
            question.typeWordBank = true;
            let clozeCount = question.prompt.split("_").length - 1;
            for(i = 0; i < clozeCount; i++){
                clozeNumber = i+1;
                clozeNumber = "<u>Answer " + clozeNumber + "</u>";
                question.prompt = question.prompt.replace("_",clozeNumber);
                console.log(clozeNumber);
            }
            if(curModule.randomChoice){
                let shuffled = question.answers
                .map(value => ({ value, sort: Math.random() }))
                .sort((a, b) => a.sort - b.sort)
                .map(({ value }) => value)
                question.answers = shuffled;
            }
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
    'click .readingNextPage': function(event){
        const t = Template.instance();
        curPage = t.curReadingPage.get();
        nextPage = curPage + 1;
        t.curReadingPage.set(nextPage);
    },
    'click .readingPrevPage': function(event){
        const t = Template.instance();
        curPage = t.curReadingPage.get();
        nextPage = curPage - 1;
        t.curReadingPage.set(nextPage);
    },
    'click .readingLastPage': function(event){
        const t = Template.instance();
        page = Modules.findOne().pages[parseInt(this.pageId)];
        curPage = t.curReadingPage.get();
        nextPage = page.questions.length;
        t.curReadingPage.set(nextPage);
    },
    'click .btn-wordbank-add': function(event){
        event.preventDefault();
        array = $(".textBank").val();
        $('.continue').prop('disabled', false); ;
        addToArray = $(event.target).html();
        if(array == ""){
            array = addToArray;
        } else {
            array = array + "," +  addToArray;
        }
        $(".textBank").val(array);
    },
    'click .btn-wordbank-clear': function(event){
        event.preventDefault();
        $(".textBank").val("");
    },
    'click .btn-read': function (event){
        console.log('reading prompt text')
        moduleData = Modules.findOne();
        let moduleId = Meteor.user().curModule.moduleId;
        moduleResults = ModuleResults.findOne({_id: moduleId});
        const t = Template.instance();
        autoTutorReadsPrompt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts);
        autoTutorPromptCharacterVoice = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).voice;
        autoTutorPromptCharacterName = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).name;
        art = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).art;
        textToRead = moduleData.pages[Meteor.user().curModule.pageId].text || false;
        textToReadStripped = $(textToRead).text();
        readTTS(t, "Let me read that for you.", autoTutorPromptCharacterVoice,autoTutorPromptCharacterName, art);
        readTTS(t, textToReadStripped, autoTutorPromptCharacterVoice,autoTutorPromptCharacterName, art);
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
                    if(typeof moduleResults.answerTags !== "undefined" || typeof Meteor.user().persistantAnswerTags !== "undefined"){
                        for(let keys of Object.keys(moduleResults.answerTags)){
                            pattern = "<(" + keys + ")>"
                            regex = new RegExp(pattern)
                            scriptToAdd = script.script.replace(regex,moduleResults.answerTags[keys]);
                        }
                        for(let keys of Object.keys(Meteor.user().persistantAnswerTags)){
                            pattern = "<(" + keys + ")>"
                            regex = new RegExp(pattern)
                            scriptToAdd = scriptToAdd.replace(regex,Meteor.user().persistantAnswerTags[keys]);
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
    'click .selectionboard': function(event){
        $(':button').prop('disabled', true); 
        event.preventDefault();
        moduleData = ModuleResults.findOne({_id: moduleId});
        nextQuestion =  event.target.getAttribute("data-index");
        moduleId = Modules.findOne()._id;
        thisPage = Meteor.user().curModule.pageId;
        moduleData.nextQuestion = nextQuestion;
        moduleData.nextPage = thisPage;
        Meteor.call("overrideUserDataRoutes",moduleData); 
        target = "/module/" + moduleId + "/" + thisPage + "/" + nextQuestion + "/return"; 
        console.log(target);
        window.location.href = target;
    },
    'click .continue': async function(event) {
        $(':button').prop('disabled', true); 
        const t = Template.instance();
        event.preventDefault();
        curModule = Modules.findOne()
        command = t.command.get();
        target = "";
        moduleId = Meteor.user().curModule.moduleId;
        moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.lastAccessed = Date.now().toString();
        thisPage = Meteor.user().curModule.pageId;
        thisQuestion = parseInt(Meteor.user().curModule.questionId);
        thisQuestionData = curModule.pages[thisPage].questions[thisQuestion]
        answerValue = 0;
        transcript = t.transcript.get() || "";
        $('#audioRecordingNotice').html("Waiting for AutoTutor to finish.");
        if(t.pageType.get() == "activity"){
            if(transcript == "" || !transcript){
                questionData = curModule.pages[thisPage].questions[thisQuestion];
                console.log(questionData, thisPage, thisQuestion,moduleData, Meteor.user().curModule);
                if(curModule.audioRecording){
                    questionData.audioRecorded = chunks;

                }
                if(questionData.type == "blank"){
                    response = $(".textInput").val();
                    answerValue = parseInt($(event.target).val());
                }
                if(questionData.type == "questionSelectionBoard"){
                    response = "continue"
                    answerValue = moduleData.questionBoardScore;
                }
                if(questionData.type == "wordbank"){
                    response = $(".textBank").val();
                    answerValue = 0;
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
                if(questionData.type == "reading"){
                    response = thisQuestion.correctAnswer || true;
                    answerValue = 0;
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
             characterResponses = [];
             if(question.type == "multiChoice"){
                for(character of curModule.autoTutorCharacter){
                        if(character.answersQuestions){
                            characterResponse = questionData.answers[Math.floor(Math.random()*questionData.answers.length)];
                            characterAnswer = characterResponse.answer
                            characterSpeech = "I think it is " + characterAnswer
                            characterRepsonseData = {
                                name: character.name,
                                response: characterAnswer,
                                voice: character.voice,
                                value: characterResponse.value,
                                speech: characterSpeech,
                                art: character.art
                            }
                            characterResponses.push(characterRepsonseData);
                        }
                    }
                }
            moduleData.responses[moduleData.responses.length - 1]=data;
            moduleData.characterResponses[moduleData.responses.length - 1] = characterResponses;
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = thisQuestion + 1;
            console.log(response);
            Meteor.call("saveModuleData", moduleData, curModule._id , thisPage, thisQuestion, response, answerValue, characterResponses, function(err, res){
                feedback = t.feedback.get();
                type = "danger"
                message = refutation || question.incorrectFeedback || "you are not correct."
                if(res != "disabled"){
                    if(res.isCorrect == true){ 
                        type = "success";
                        message = refutation || "you are correct!";
                    } 
                    message = Meteor.user().firstname + ", " + message;
                    for(charResponse of res.characterRefutation){
                        if(charResponse.isCorrect){
                            message = "Yes, " + charResponse.character + " you are correct." + message;
                        } else {
                            message = "No, " + charResponse.character + " you are incorrect." + message;
                        }
                    }
                    if(res)
                    addedClass = 'alert-' + type;
                    $('#refutation').addClass(addedClass);
                    $('#refutation').text(message);
                    $('#refutation').show();
                    if(curModule.autoTutorReadsRefutation){
                        autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                        autoTutorCharacter = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts);
                        for(response of characterResponses){
                            readTTS(t, response.speech, response.voice, response.name, response.art);
                        }
                        readTTS(t, message, autoTutorCharacter.voice, autoTutorCharacter.name, autoTutorCharacter.art);
                    }
                }
            });
            Meteor.setInterval(async function(){
                audioActive = t.audioActive.get();
                console.log(audioActive);
                if(!audioActive){
                    timeOut = curModule.feedbackTimeout * 1000 || 5000;
                    await sleep(timeOut);
                    $('#refutation').removeClass('alert-success');
                    $('#refutation').removeClass('alert-danger');
                    $('#refutation').text("");
                    $('#refutation').hide();
                    $(':button').prop('disabled', false); 
                    $(':button').removeClass('btn-info');
                    moduleData = ModuleResults.findOne({_id: moduleId});
                    if(!curModule.enableAdaptivePages || curModule.pages[thisPage].questions.length > thisQuestion + 1 || command == "return"){
                        if(command == "return"){
                            nextQuestion = 0;
                            nextPage = thisPage;
                            nextQuestionData = curModule.pages[thisPage].questions[nextQuestion];
                            if(nextQuestionData.type == "questionSelectionBoard"){
                                if(moduleData.questionBoardScore){
                                    moduleData.questionBoardScore += answerValue;
                                } else {
                                    moduleData.questionBoardScore = answerValue;
                                }
                                if(moduleData.questionBoardAnswered){
                                    moduleData.questionBoardAnswered.push(thisQuestion);
                                }else{
                                    moduleData.questionBoardAnswered = [thisQuestion];
                                }
                            }
                            moduleData.nextQuestion = 0;
                            moduleData.nextPage = thisPage;
                            Meteor.call("overrideUserDataRoutes",moduleData); 
                        } else {
                            nextQuestion = thisQuestion + 1;
                            nextQuestionData = curModule.pages[thisPage].questions[nextQuestion];
                        }
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
                                moduleData.nextPage = nextPage;
                                moduleData.nextQuestion = 0;
                            } else {
                                target = "/module/" + curModule._id + "/completed"; 
                            }
                        }
                        Meteor.call("overrideUserDataRoutes",moduleData); 
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
                    console.log("ROUTE:", target);
                    window.location.href = target;
                }
            }, 100)
        }
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
            responses: [],
            characterResponses: []
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
    this.command = new ReactiveVar(params._command);
    this.questionType = new ReactiveVar("");
    this.pageType = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.curReadingPage = new ReactiveVar(0);
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
function readTTS(template, message, voice, character,characterArt,scriptAlt){
    let curModule = Modules.findOne();
    let moduleId =  curModule._id;
    let audioActive = template.audioActive.get();
    template.audioActive.set(true);
    let displayMessage = character + ": " + message;
    const characterSearch = (element) => element.name == character;
    let characterIndex = curModule.autoTutorCharacter.findIndex(characterSearch);
    let audioObj = new Audio();
    let audioObjects = template.audioObjects.get();
    audioObjects.push({obj:audioObj, art:characterArt, character:character, displayMessage:displayMessage, characterIndex:characterIndex});
    let order = audioObjects.length;
    template.audioObjects.set(audioObjects);
    if(scriptAlt){
        message = scriptAlt;
    }
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
    let atTemplate = "#ATTemplate" + audioObjs[TTSTracPlaying].characterIndex;
    var clone = $(atTemplate).clone().prependTo('.autoTutorHistory');
    $('.autoTutorHistory').show();
    let scriptHandle = atTemplate + " .script";
    let avatarHandle = atTemplate + " .avatar";
    $(avatarHandle).html("<img src='" + audioObjs[TTSTracPlaying].art + "' style='max-width:100%; padding=20px;'><br>");
    $(scriptHandle).html(audioObjs[TTSTracPlaying].displayMessage);
    $(clone).fadeIn();
    $(clone).attr("id","ATTemplateFinished");
    console.log(TTSTracPlaying, "of" , audioObjs.length) - 1;
    template.TTSTracPlaying.set(TTSTracPlaying + 1);
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        TTSTracPlaying++;
        template.TTSTracPlaying.set(TTSTracPlaying);
        if(audioObjs.length > TTSTracPlaying){
            sleep(1000).then(function(){
                playAudio(template);
                curModule = Modules.findOne();
                if(curModule.scriptFadeTime || curModule.scriptFadeTime == "" || curModule.scriptFadeTime == 0){
                    fadeTime = curModule.scriptFadeTimeout * 1000;
                    sleep(300).then(function(){
                        $(clone).fadeOut(fadeTime);
                    });
                }
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
                    sleep(3000).then(function(){
                        $('.continue').click();
                    })
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