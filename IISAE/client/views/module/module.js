import hark from 'hark';


var chunks = [];

//pause and remove src from all audio dom elements when we leave the page
function pauseAudio(){
    let audioObjects = document.getElementsByTagName('audio');
    for(let i = 0; i < audioObjects.length; i++){
        audioObjects[i].pause();
        audioObjects[i].src = "";
        //delete audioObjects[i];
        audioObjects[i].remove();
    }
    template.audioObjects.set([]);
    template.audioActive.set(false);
}

//onbeforeunload, call pauseAudio
window.onbeforeunload = function() {
    pauseAudio();
};

Template.module.onRendered(function() {

    $('#scrollArea').scroll(function(){
        element = document.getElementById('scrollArea');
        if(Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop) === 0){
            $(".continue").prop( "disabled", false );
        }
    });
    $('#visualizer').hide();
    moduleData = Modules.findOne();
    let moduleId = Meteor.user().curModule.moduleId;
    const t = Template.instance();
    moduleResults = ModuleResults.findOne({_id: moduleId});
    data = {
        events: [],
        responses: []
    }
    moduleResults.responses.push(data);
    Meteor.call('updateModuleData',moduleResults);
    autoTutorReadsPrompt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts);
    autoTutorPromptCharacterVoice = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).voice;
    autoTutorPromptCharacterName = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).name;
    art = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).art;
    autoTutorReadsScript = moduleData.autoTutorReadsScript;
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
                    scriptToAdd = scriptToAdd.replace('_user_', Meteor.user().firstname);
                    readTTS(t,scriptToAdd,voice,character, art, script.scriptAlt);
                } else {
                    scriptToAdd = script.script.replace('_user_', Meteor.user().firstname);
                    readTTS(t,scriptToAdd,voice,character, art, script.scriptAlt);
                }
            } else {
                scriptToAdd = script.script.replace('_user_', Meteor.user().firstname);
                readTTS(t,scriptToAdd,voice,character, art, script.scriptAlt);
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

    //get question type
    questionType = moduleData.pages[Meteor.user().curModule.pageId].questions[Meteor.user().curModule.questionId].type;



});

Template.module.helpers({
    'windowSize': function(){
        size = Session.get('windowSize');
        page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        obscuri = question.imageObscurus;
        answers = question.answers;
        answersWithXCoords = answers.filter(function(answer){
            return answer.xCoord;
        });
        console.log(obscuri);
        if(obscuri.length > 0){
            image = $('#imageClickOver').attr('src');
            displayObscuri(image,obscuri);
        }
        if(answersWithXCoords.length > 0){
            image = $('#imageClickOver').attr('src');
            displayClickOverOptions(image,answersWithXCoords);
        }
        return "";
    },
    'showAudioPlayButton': function(){
        template = Template.instance();
        displayButton = template.showPlayButton.get();
        console.log("Display Audio Button: " + displayButton);
        return displayButton;
    },
    'module': () => Modules.findOne(),
    'trialData': function(){
        let moduleId = Meteor.user().curModule.moduleId;
        let moduleData = ModuleResults.findOne({_id: moduleId});
        moduleData.statsDisplay = [];
        for(stat in Object.keys(moduleData.stats)){
            moduleData.statsDisplay.push({
                stat: Object.keys(moduleData.stats)[stat],
                value: moduleData.stats[Object.keys(moduleData.stats)[stat]]
            });
        }
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
        $('.continue').prop('disabled', false); 
        $('.continue').removeClass('btn-info');
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
            for(index in questionsAvailable){
                questionsAvailable[index].index = parseInt(index);
            }
            if(moduleData.questionBoardAnswered){
                for(questionIndex of moduleData.questionBoardAnswered){
                    questionIndex = parseInt(questionIndex);
                    let findIndex = questionsAvailable.map(e => e.index).indexOf(questionIndex);
                    questionsAvailable.splice(findIndex, 1);
                }
            }
            question.availableQuestions = [];
            for(questionIndex in questionsAvailable){
                category = questionsAvailable[questionIndex].category;
                if(category){
                    if(!question.availableQuestions.categories){
                        question.availableQuestions.categories  = [{category: category, questions: []}];
                    }
                    if(question.availableQuestions.categories.map(e => e.category).indexOf(category) == - 1){
                        question.availableQuestions.categories.push({category: category, questions: []})
                    }
                    categoryIndex = question.availableQuestions.categories.map(e => e.category).indexOf(category);
                    question.availableQuestions.categories[categoryIndex].questions.push(questionsAvailable[questionIndex]);
                }
            }
        };
        if(question.type == "scrollbar"){
            question.typeScroll = true;
        };
        if(question.type == "autotutorscript"){
            question.typeATScript = true;
            autoAdvance = question.autoAdvance || false;
            t.autoAdvance.set(autoAdvance);
        }
        if(question.type == "link"){
            question.typeLink = true;
            b = question.prompt.replace(/<a>/gm,"<a id='continueLink'>");
            question.prompt = b;
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
        if(question.type == "imageClick"){
            question.typeImageClick = true;
            imagePos = $('#imageClickOver').offset();
            answers = question.answers;
            question.answers = answers
        };
        if(question.type == "reading"){
            question.typeReading = true;
            if(!question.readingIsPagePrompt){
                question.curPassageNumber = t.curReadingPage.get();
                question.curPassage = question.passages[question.curPassageNumber].text;
                question.curPage = page.prompt;
                if(page.questions.length - 1 == question.curPassageNumber){
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
            } else {
                $('.readingLastPage').hide();
                $('.readingNextPage').hide();
                $('.readingPrevPage').hide();
                question.curPassage = page.text;
            }

        };
        if(question.type == "wordbank"){
            question.typeWordBank = true;
            let clozeCount = question.prompt.split("_").length - 1;
            for(i = 0; i < clozeCount; i++){
                clozeNumber = i+1;
                clozeNumber = "<u>Answer " + clozeNumber + "</u>";
                question.prompt = question.prompt.replace("_",clozeNumber);
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
    'autoTutorHidden': function(){
        //get template
        let t = Template.instance();
        //get autoTutorHidden from template
        let autoTutorHidden = t.autoTutorHidden.get();
        //return autoTutorHidden
        return autoTutorHidden;
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
    },
    'avatarTimeOut': function(){
        const t = Template.instance();
        //return timer in seconds from milliseconds
        return Math.round(t.avatarTimeOut.get() / 1000);
    },
    'options': function(){
        //get user's organization
        org = Orgs.findOne({orgOwnerId: Meteor.userId()});
        if(org){
            return org.options;
        }
    }
});

Template.module.events({
    'load #imageClickOver': function(event, template){    
        size = Session.get('windowSize');
                page = Modules.findOne().pages[parseInt(this.pageId)];
        question = page.questions[parseInt(this.questionId)];
        obscuri = question.imageObscurus;
        answers = question.answers;
        answersWithXCoords = answers.filter(function(answer){
            return answer.xCoord;
        });
        console.log(obscuri);
        if(obscuri.length > 0){
            image = $('#imageClickOver').attr('src');
            displayObscuri(image,obscuri);
        }
        if(answersWithXCoords.length > 0){
            image = $('#imageClickOver').attr('src');
            displayClickOverOptions(image,answersWithXCoords);
        }
    },
    'keypress #response' : function(event){
        event.preventDefault();
        if (event.keyCode === 13) {
            const t = Template.instance();
            recordEvent(t,"keyboardEnterkey");
            $(".continue").click();
        } else {
            value = $('#response').val();
            value += String.fromCharCode(event.keyCode);
            value = $('#response').val(value);
        }
    },
    'mouseover .multichoice': function(event){
        response = $(event.target).html();
        responseAlt = $(event.target).attr("data-alt");
        curModule = Modules.findOne();
        const t = Template.instance();
        recordEvent(t,"multiChoiceMouseOver",Meteor.userId(),{response: response});
        //wait 2000ms before playing audio
        setTimeout(function(){
            audioActive = t.audioActive.get();
            if(!audioActive){
                if(curModule.autoTutorReadsChoices && response){
                    autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                    autoTutorPromptCharacterVoice = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts).voice;
                    autoTutorPromptCaracterArt = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts).art;
                    if(responseAlt && responseAlt != ""){
                        readTTS(t, response, autoTutorPromptCharacterVoice, autoTutorPromptCaracterArt, autoTutorReadsPrompt, responseAlt);
                    } else {
                        readTTS(t, response, autoTutorPromptCharacterVoice, autoTutorPromptCaracterArt, autoTutorReadsPrompt);
                    }
                }
            }
        }, 2000);
    },
    'click .nav-link': function(event){
        pauseAudio();
    },
    'click .readingNextPage': function(event){
        const t = Template.instance();
        recordEvent(t,"readNextPage");
        curPage = t.curReadingPage.get();
        nextPage = curPage + 1;
        t.curReadingPage.set(nextPage);
    },
    'click .readingPrevPage': function(event){
        const t = Template.instance();
        recordEvent(t,"readPrevPage");
        curPage = t.curReadingPage.get();
        nextPage = curPage - 1;
        t.curReadingPage.set(nextPage);
    },
    'click .readingLastPage': function(event){
        const t = Template.instance();
        recordEvent(t,"readLastPage");
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
        const t = Template.instance();
        recordEvent(t,"addWordBankItemToResponse",Meteor.userId(),{response: addToArray});
        $(".textBank").val(array);
    },
    'click .btn-wordbank-clear': function(event){
        const t = Template.instance();
        event.preventDefault();
        recordEvent(t,"clearWordBankResponse");
        $(".textBank").val("");
    },
    'click .toggleMessageWindow': function(event){
        const t = Template.instance();
        //set autoTutorHidden to opposite of current value
        t.autoTutorHidden.set(!t.autoTutorHidden.get());
        //if autoTutorContainer class element exists
        if($(".autoTutorHistory").length){
            //add autoTutorHidden class element to autoTutorContainer
            $(".autoTutorHistory").toggleClass("autoTutorHistoryHidden");
            //get all divs inside autoTutorHistory
            let divs = $(".autoTutorHistory").children();
            //get the last div
            let lastDiv = divs[divs.length - 1];
            //get the last div's height
            let lastDivHeight = $(lastDiv).height();
            //display current height of autoTutorHistory
            let currentHeight = $(".autoTutorHistory").height();
            //if autoTutorHistory is hidden
            if($(".autoTutorHistory").hasClass("autoTutorHistoryHidden")){
                //change the height of the autoTutorHistory to the height of the last div plus 20px
                $(".autoTutorHistory").height(lastDivHeight);
                //scroll to the bottom of the autoTutorHistory
                $(".autoTutorHistory").scrollTop($(".autoTutorHistory")[0].scrollHeight);
            } else {
                //change the height of the autoTutorHistory to the max height of 40vh and unset the height
                $(".autoTutorHistory").height("");
                //scroll to the bottom of the autoTutorHistory
                $(".autoTutorHistory").scrollTop($(".autoTutorHistory")[0].scrollHeight);
            }
        }
    },
    'click #autotutor-video': function(event){
        const t = Template.instance();
        recordEvent(t,"videoClick");
        //get this page
        page = Modules.findOne().pages[parseInt(this.pageId)];
        //get the videoReference
        videoReference = page.questions[parseInt(this.questionId)].videoReference || false;
        //if videoReference is not false
        if(videoReference){
            //open video in new window
            window.open(videoReference, '_blank');
        } else {
            alert("No video reference found for this question");
        }
    },
    'click .btn-read': function (event){
        const t = Template.instance();
        recordEvent(t,"clickReadPromptButton");
        moduleData = Modules.findOne();
        let moduleId = Meteor.user().curModule.moduleId;
        moduleResults = ModuleResults.findOne({_id: moduleId});
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
        const t = Template.instance();
        recordEvent(t,"clickRepeatConversationButton");
        moduleData = Modules.findOne();
        let moduleId = Meteor.user().curModule.moduleId;
        moduleResults = ModuleResults.findOne({_id: moduleId});
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
                        scriptToAdd = script.script.replace('_user_', Meteor.user().firstname);
                        readTTS(t,scriptToAdd,voice,character, art);
                    } else {
                        scriptToAdd = script.script.replace('_user_', Meteor.user().firstname);
                        readTTS(t,script.script,voice,character, art);
                    }
                } else {
                    scriptToAdd = script.script.replace('_user_', Meteor.user().firstname);
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
        $('.continue').prop('disabled', true); 
        event.preventDefault();
        moduleData = ModuleResults.findOne({_id: moduleId});
        nextQuestion =  event.target.getAttribute("data-index");
        const t = Template.instance();
        recordEvent(t,"clickSelectionBoardButton",Meteor.userId(),{nextQuestion: nextQuestion});
        moduleId = Modules.findOne()._id;
        thisPage = Meteor.user().curModule.pageId;
        moduleData.nextQuestion = nextQuestion;
        moduleData.nextPage = thisPage;
        Meteor.call("overrideUserDataRoutes",moduleData); 
        target = "/module/" + moduleId + "/" + thisPage + "/" + nextQuestion + "/return"; 
        window.location.href = target;
    },
    'click .continue': async function(event) {
        //scroll to top of page using animate
        $('html, body').animate({ scrollTop: 0 }, 'slow');
        const t = Template.instance();
        //change template studentAnswering to true
        t.studentAnswering.set(true);
        recordEvent(t,"clickContinue");
        $('.continue').prop('disabled', true); 
        $(event.target).addClass("selected");
        event.preventDefault();
        curModule = Modules.findOne()
        command = t.command.get();
        target = "";
        moduleId = Meteor.user().curModule.moduleId;
        moduleData = ModuleResults.findOne({_id: moduleId});
        timeStamp = new Date();
        moduleData.responseTime = timeStamp.getTime();
        moduleData.renderTime = t.renderTime.get();
        moduleData.speakingTime = t.speakingTime.get();
        data = moduleData.responses[moduleData.responses.length - 1];
        moduleData.lastAccessed = Date.now().toString();
        thisPage = Meteor.user().curModule.pageId;
        thisQuestion = parseInt(Meteor.user().curModule.questionId);
        thisQuestionData = curModule.pages[thisPage].questions[thisQuestion]
        answerValue = 0;
        userResponse = "";
        transcript = t.transcript.get() || "";
        $('#audioRecordingNotice').html("Waiting for AutoTutor to finish.");
        if(t.pageType.get() == "activity"){
            if(transcript == "" || !transcript){
                questionData = curModule.pages[thisPage].questions[thisQuestion];
                if(curModule.audioRecording){
                    questionData.audioRecorded = chunks;

                }
                if(questionData.type == "blank"){
                    userResponse = $(".textInput").val();
                    answerValue = parseInt($(event.target).val());
                }
                if(questionData.type == "questionSelectionBoard"){
                    userResponse = "continue"
                    answerValue = moduleData.questionBoardScore;
                }
                if(questionData.type == "wordbank"){
                    userResponse = $(".textBank").val();
                    answerValue = 0;
                }
                if(questionData.type == "autotutorscript"){
                    userResponse = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "video"){
                    userResponse = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "html"){
                    userResponse = "continue";
                    answerValue = 0;
                }
                if(questionData.type == "scrollbar"){
                    userResponse = thisQuestion.correctAnswer || true;
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
                    var target = event.target || event.srcElement;
                    userResponse = target.textContent;
                    answerValue = parseInt($(event.target).val()) || 0;
                    index = event.target.getAttribute('id');
                    if(questionData.answers[index].feedback != "" || typeof questionData.answers[index].feedback != "undefined"){
                        refutation = thisQuestionData.answers[index].feedback;
                    }
                }
                if(questionData.type == "imageClick"){
                    response = parseInt(event.target.getAttribute('id'));
                    index = parseInt(event.target.getAttribute('id'));
                    userResponse = questionData.answers[index].answer;
                    if(questionData.answers[index].feedback){
                        refutation = questionData.answers[index].feedback;
                    }
                }
                if(questionData.type == "longtext"){
                    userResponse = $('.textareaInput').val();
                }
            } else {
                response = transcript;
                answerValue = 1;
            }
            data.questionType = t.questionType.get();
            data.pageId =  thisPage;
            data.questionId = thisQuestion;
            data.response =  userResponse;
            data.responseTimeStamp = Date.now().toString();
            data.result = ""
            recordEvent(t,"responseSelect", Meteor.userId(), data.response);
            if(curModule.autoTutorReadsResponse && response){
                autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                autoTutorPromptCharacterVoice = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts).voice;
                readTTS(t, response);
             }
             characterResponses = [];
             if(question.type == "multiChoice"){
                for(character of curModule.autoTutorCharacter){
                        if(character.answersQuestions){
                            if(character.expectedPerformance){
                                if(character.expectedPerformance > Math.random()){
                                    //get correct answer
                                    characterResponse = question.correctAnswer;
                                    //get index of correct answer
                                    selectedAnswer = question.answers.findIndex(x => x.answer == correctAnswer);
                                    characterAnswer = question.answers[selectedAnswer].answer;
                                } else {
                                    //get correct answer
                                    correctAnswer = question.correctAnswer;
                                    //get index of correct answer
                                    selectedAnswer = question.answers.findIndex(x => x.answer == correctAnswer);
                                    //get all incorrect answers
                                    incorrectAnswers = question.answers.filter(function(answer) {
                                        return answer.answer != correctAnswer;
                                    });
                                    //get random number between 0 and length of incorrect answers
                                    selectedAnswer = Math.floor(Math.random() * incorrectAnswers.length);
                                    //get random incorrect answer
                                    characterResponse = incorrectAnswers[selectedAnswer];
                                    characterAnswer = incorrectAnswers[selectedAnswer].answer;
                                }
                            } else {
                                selectedAnswer = Math.floor(Math.random() * question.answers.length);
                                characterResponse = questionData.answers[selectedAnswer];
                                characterAnswer = questionData.answers[selectedAnswer].answer;
                            }
                            message = getAgentSpeech(character.name, curModule, "response", thisPage, thisQuestion, selectedAnswer, selectedAnswer, 0);
                            readTTS(t, message, character.voice, character.name, character.art);
                            characterSpeech = message;
                            characterRepsonseData = {
                                name: character.name,
                                response: characterAnswer,
                                voice: character.voice,
                                value: characterResponse.value,
                                choiceIndex: selectedAnswer,
                                speech: characterSpeech,
                                art: character.art
                            }
                            characterResponses.push(characterRepsonseData);
                            //get target's x and y coordinates
                            var target = document.getElementById(selectedAnswer);
                            var rect = target.getBoundingClientRect();
                            var x = 0;
                            var y = 0;
                            
                            

                        }
                    }
                }
                if(question.type == "imageClick"){
                    for(character of curModule.autoTutorCharacter){
                            if(character.answersQuestions){
                                selectedAnswer = Math.floor(Math.random() * question.answers.length);
                                characterResponse = questionData.answers[selectedAnswer];
                                characterAnswer = questionData.answers[selectedAnswer].answer;
                                //message = getAgentSpeech(character.name, curModule, "response", thisPage, thisQuestion, selectedAnswer, 0, 0);
                                message = getAgentSpeech(character.name, curModule, "response", thisPage, thisQuestion, selectedAnswer, selectedAnswer, 0);
                                readTTS(t, message, character.voice, character.name, character.art);
                                characterSpeech = message;
                                characterRepsonseData = {
                                    name: character.name,
                                    response: characterAnswer,
                                    voice: character.voice,
                                    value: characterResponse.value,
                                    choiceIndex: selectedAnswer,
                                    speech: characterSpeech,
                                    art: character.art
                                }
                                characterResponses.push(characterRepsonseData);
                                var target = document.getElementById(selectedAnswer);
                                var x = 0;
                                var y = 0;


                            }
                        }
                    }
            moduleData.responses[moduleData.responses.length - 1]=data;
            moduleData.characterResponses[moduleData.responses.length - 1] = characterResponses;
            moduleData.nextPage = thisPage;
            moduleData.nextQuestion = thisQuestion + 1;
            
            await Meteor.call("evaluateModuleData", moduleData, curModule._id , thisPage, thisQuestion, data.response, answerValue, characterResponses, function(err, res){                feedback = t.feedback.get();
                moduleData = res.moduleData;
                type = "danger";
                username = Meteor.user().firstname;
                if(res != "disabled"){
                    message = getAgentSpeech(username, curModule, "feedback", thisPage, thisQuestion, answerValue, 0, res.isCorrect);
                    for(charResponse of res.characterRefutation){
                        //check if charResponse.isCorrect and res.isCorrect are the same
                        if(charResponse.isCorrect == res.isCorrect){
                            //if they are the same, then the character is agreeing with the user
                            speakingToArray = [username, charResponse.character];
                            message = getAgentSpeech(speakingToArray, curModule, "feedback", thisPage, thisQuestion, answerValue, 0, res.isCorrect);
                        } else {
                            message += " "+ getAgentSpeech(charResponse.character, curModule, "feedback", thisPage, thisQuestion, charResponse.choiceIndex, 0, charResponse.isCorrect);
                        }
                    }
                    recordEvent(t,"showRefutation","system",{refutation:message});
                    if(curModule.autoTutorReadsRefutation){
                        autoTutorReadsPrompt = curModule.autoTutorReadsPrompt;
                        autoTutorCharacter = curModule.autoTutorCharacter.find(o => o.name == curModule.characterReadsPrompts);
                        readTTS(t, message, autoTutorCharacter.voice, autoTutorCharacter.name, autoTutorCharacter.art);
                    }
                    $('.multichoice').addClass('btn-selected');
                    if(res.isCorrect == true){ 
                        type = "success";
                        $(event.target).addClass('btn-correct').removeClass('selected');
                    } else {
                        $(event.target).addClass('btn-wrong').removeClass('selected');
                        correctIndex = res.correctAnswerIndex;
                        $('.multichoice[id="'+correctIndex+'"]').addClass('btn-correct');
                        $('.overlay[id="'+correctIndex+'"]').addClass('btn-correct');
                    }
    
                    recordEvent(t,"evaluate", "system", {result: res});
                    addedClass = 'alert-' + type;
                    $('#refutation').addClass(addedClass);
                    $('#refutation').text(message);
                    $('#refutation').show();

                    
                }
                moduleData.responses[moduleData.responses.length - 1].result = res.isCorrect || "disabled";
            });
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
                } else {
                    nextQuestion = thisQuestion + 1;
                    nextQuestionData = curModule.pages[thisPage].questions[nextQuestion];
                    nextQuestion = nextQuestion;
                    nextPage = thisPage;
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
            } else {
                conditions = curModule.pages[thisPage].nextFlow;
                routePicked = false;
                if(conditions.length > 0){
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
                                if(conditions[i].clearScoring){
                                    moduleData.score = 0;
                                } 
                            }
                        }
                    }
                }
                if(curModule.customConditionScript && !routePicked){
                    script = new Function("stats", curModule.customConditionScript);
                    stats = moduleData.stats;
                    [nextPage, nextQuestion, customVariable, customValue] = script(stats);
                    if(moduleData.customCondition){
                        moduleData.nextPage = nextPage;
                        moduleData.nextQuestion = nextQuestion;
                        moduleData.stats[customVariable] = customValue;
                        target = "/module/" + curModule._id + "/" + nextPage + "/" + nextQuestion;
                        routePicked = true;
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
                }
            }
            Meteor.call("overrideUserDataRoutes",moduleData);
            timeOut = 0;
            if(curModule.feedbackTimeout){
                timeOut = curModule.feedbackTimeout * 1000;
            }
            setInterval(checkAvatarsFinished, 1000,  timeOut, target, finishQuestion);
            function checkAvatarsFinished( timeOut, target, finishQuestion){
                audioActive = t.audioActive.get();
                if(!audioActive){
                    $('#refutation').removeClass('alert-success');
                    $('#refutation').removeClass('alert-danger');
                    $('#refutation').text("");
                    $('#refutation').hide();
                    $('.continue').prop('disabled', false);
                    $('.continue').removeClass('btn-info');
                    setTimeout(finishQuestion, timeOut, target);
                }
            }
            function finishQuestion(target){
                
                recordEvent(t,"routeToNext", "system", {target:target});
                curModuleData = Meteor.user().curModule.nextPage;
                window.location.href = target;                
            }
        }
    },
    'click #startActivity': function(event){
        target =  $(location).attr('href') + "/0";
        window.location.href = target;
    },
    'click .multichoice': function(event){
        event.preventDefault();
        const t = Template.instance();
        transcript = t.transcript.get() || ""; 
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
    },
    'click #playAudio': function(event){
        template.audioActive.set(true);
        template.showPlayButton.set(false);
        audioObj = template.firstAudioObj.get();
        audioObj.play();
    },
    'click #autoplayModal': function(event){
        event.preventDefault();
        //set the session variable Pause to true
        Session.set('pauseSession', true);
        console.log("pauseSession: " + Session.get('pauseSession'));    
        //set the modalTemplate session variable to the reportError template
        Session.set('modalTemplate', 'autoplayModal');
        console.log("modalTemplate: " + Session.get('modalTemplate'));
    },
})
Template.module.onCreated(function(){
    template = this;
    params = Router.current().params;
    Meteor.subscribe('curModule', params._id);
    this.command = new ReactiveVar(params._command);
    this.questionType = new ReactiveVar("");
    this.autoAdvance = new ReactiveVar(false);
    var currentTimeStamp = new Date().getTime();
    this.renderTime = new ReactiveVar(currentTimeStamp);
    this.speakingTime = new ReactiveVar(0);
    this.startAudioTime = new ReactiveVar(0);
    this.pageType = new ReactiveVar("");
    this.feedback = new ReactiveVar(false);
    this.curReadingPage = new ReactiveVar(0);
    this.statsData = new ReactiveVar({});
    this.audioActive = new ReactiveVar(false);
    this.audioObjects = new ReactiveVar([]);
    this.audioToSave = new ReactiveVar("");
    this.transcript = new ReactiveVar("");
    this.TTSTracPlaying = new ReactiveVar(0);
    this.events = new ReactiveVar([]);
    this.timer = new ReactiveVar(false);
    this.studentAnswering = new ReactiveVar(false);
    this.autoTutorHidden = new ReactiveVar(false);
    this.promptQueued = new ReactiveVar(false);
    this.showPlayButton = new ReactiveVar(false);
    this.firstAudioObj = new ReactiveVar(false);
    
})
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function readTTS(template, message, voice, character,characterArt,scriptAlt){
    //remove quotes from message
    message = message.replace(/"/g, "");
    recordEvent(template,"addAutoTutorScriptToTTSQueue","system",{character:character, text:message});
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
            audioObjects[order - 1].obj.src = "data:audio/ogg;base64," + res;
            template.audioObjects.set(audioObjects)
            if(!audioActive){
                $('.continue').prop('disabled', true); 
                $('.continue').prop('hidden', true); 
                template.audioActive.set(true);
                playAudio(template);
            }
        }
    });
}

async function playAudio(template){
    //if template autoTutorHidden variable is true, simulate button click
    let autoTutorHidden = template.autoTutorHidden.get();
    if(autoTutorHidden){
        $(".toggleMessageWindow").click();
    }
    let TTSTracPlaying = template.TTSTracPlaying.get();
    let audioObjs = template.audioObjects.get();
    const audioObj = audioObjs[TTSTracPlaying].obj;
    let atTemplate = "#ATTemplate" + audioObjs[TTSTracPlaying].characterIndex;
    var clone = $(atTemplate).clone().appendTo('.autoTutorHistory'); 
    $('.autoTutorHistory').show();
    // let scriptHandle = atTemplate + " .script";
    // let avatarHandle = atTemplate + " .avatar";
    // get clone's child with class script
    let scriptHandle = clone.find(".script");
    let avatarHandle = clone.find(".avatar");
    $(avatarHandle).html("<img src='" + audioObjs[TTSTracPlaying].art + "' class='img-responsive'><br>");
    $(scriptHandle).html(audioObjs[TTSTracPlaying].displayMessage);
    $(clone).fadeIn();
    var elem = document.getElementById("autoTutorHistory");
    elem.scrollTop = elem.scrollHeight;
    template.TTSTracPlaying.set(TTSTracPlaying + 1);
    window.currentAudioObj = audioObj;
    window.currentAudioObj.addEventListener('ended', function(){
        TTSTracPlaying++;
        recordEvent(template,"autoTutorScriptLineEnd", "system");
        template.TTSTracPlaying.set(TTSTracPlaying);
        if(audioObjs.length > TTSTracPlaying){
            sleep(1000).then(function(){
               //get pausedSession session variable
                let pausedSession = Session.get("pauseSession");
                //wait until pausedSession is false using an interval
                let interval = setInterval(function(){
                    pausedSession = Session.get("pauseSession");
                    console.log("pausedSession: ", pausedSession);
                    if(!pausedSession){
                        clearInterval(interval);
                        playAudio(template);
                        curModule = Modules.findOne();
                        if(curModule.scriptFadeTime || curModule.scriptFadeTime == "" || curModule.scriptFadeTime == 0){
                            fadeTime = curModule.scriptFadeTimeout * 1000;
                            sleep(300).then(function(){
                                $(clone).fadeOut(fadeTime);
                            });
                        }
                    }
                }, 1000);
            });
        }
        else{
            var curTime = new Date().getTime();
            var audioTime = curTime - template.startAudioTime.get();
            var speakingTime = template.speakingTime.get();
            if(curModule.avatarTimeOutMin && curModule.avatarTimeOutMax){
                startAgentSpeechTimer(template, curModule.avatarTimeOutMin, curModule.avatarTimeOutMax);
            }
           
            speakingTime = speakingTime + audioTime;
            template.speakingTime.set(speakingTime);
            sleep(1000).then(function(){
                //if template autoTutorHidden variable is true, simulate button click
                let autoTutorHidden = template.autoTutorHidden.get();
                if(!autoTutorHidden){
                    $(".toggleMessageWindow").click();
                    //
                }
                //remove div element tags from class multichoice elements
                $(".multichoice").each(function(){
                   //remove all div tags
                     $(this).find("div").remove();
                });
                recordEvent(template,"autoTutorScriptQueueEnd", "system");
                questionType = template.questionType.get();
                autoAdvance = template.autoAdvance.get();
                template.audioActive.set(false);
                $('#audioRecordingNotice').html("I am listening.");
                
                $('#audiovis').show();
                moduleData = Modules.findOne({});
                if(moduleData.audioRecording){
                    setupRecording(template);
                }
                questionType = template.questionType.get();
                if(questionType == "video" || questionType == "link" || questionType == "scrollbar"){
                    $('.continue').prop('disabled', true); 
                    $('.continue').prop('hidden', true); 
                } else {
                    $('.continue').prop('disabled', false); 
                    $('.continue').prop('hidden', false); 
                    $('.continue').prop('disabled', false);
                    $('.continue').prop('hidden', false);
                }
                if(autoAdvance == true){
                    sleep(3000).then(function(){
                        $('.continue').click();
                    })
                }
                }
            );
        }
    });
    recordEvent(template,"autoTutorScriptAudioStart", "system");
    promise = window.currentAudioObj.play();
    if (promise !== undefined) {
        promise.then(_ => {
            // Autoplay started!
            console.log("Audio started playing");
        }).catch(error => {
            //set showPlayButton to true
            template.showPlayButton.set(true);
            $(clone).hide();
            //set template.firstAudio to window.currentAudioObj
            template.firstAudioObj.set(window.currentAudioObj);
        });
    }
    template.startAudioTime.set(new Date().getTime());
}
function setupRecording(template){
    recordEvent(template,"initializeVoiceRecognition", "system");
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
            if (event.data.size > 0 && template.feedback.get() == false) {
                chunks = [event.data];
                processAudio(chunks);
            } else {
                $('#audioRecordingNotice').html("I am waiting for AutoTutor to finish.");
            }
        }

        async function processAudio(chunks) {
            recordEvent(template,"processVoiceRecognition", "system");
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
                recordEvent(template,"voiceRecognitionTranscript", "system", {transcript:transcript});
                if(transcript != "" || typeof transcript !== "undefined"){
                    stream.getTracks() // get all tracks from the MediaStream
                    forEach( track => track.stop() ); // stop each of them
                }
            }
        })
    }

  
      speechEvents.on('stopped_speaking', function() {
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
function recordEvent(template,verb,actor,data){
    let events = template.events.get();
    eventToPass = {
        actor: actor || Meteor.userId(),
        verb: verb,
        data: data || "none",
        time: Date.now(),
    }
    events.push(eventToPass)
    template.events.set(events);
}

function displayObscuri(imageSrc, obscuri){
    //create dummy image of imageSrc
    var img = new Image();
    img.src = imageSrc;
    // delete old obscuri
    $('.obscuri').remove();
    img.onload = function(){
        //get image dimensions
        var width = img.width;
        var height = img.height;
        //get display image
        var dispImage = $('#imageClickOver');
        //get dispImage rendered dimensions
        var dispWidth = dispImage.width();
        var dispHeight = dispImage.height();
        //get ratio of image to display image
        var ratio = width/dispWidth;
        //iterate through obscuri
        for(var i = 0; i <= obscuri.length; i++){
            console.log("obscuri", obscuri);
            obscuris = obscuri[i];
            //get obscuri dimensions and position, removiting trailing px
            var obscuriWidth = obscuris.width.slice(0,-2);
            var obscuriHeight = obscuris.height.slice(0,-2);
            var obscuriX = obscuris.x.slice(0,-2);
            var obscuriY = obscuris.y.slice(0,-2);
            //get obscuri position on display image
            var dispObscuriX = obscuriX/ratio;
            var dispObscuriY = obscuriY/ratio;
            //get obscuri dimensions on display image
            var dispObscuriWidth = obscuriWidth/ratio;
            var dispObscuriHeight = obscuriHeight/ratio;
            //get obscruri font size, bgcolor, text color
            var fontSize = obscuris.fontSize;
            var fontFam = obscuris.fontFamily;
            var bgColor = obscuris.bgColor;
            var textColor = obscuris.textColor;
            //get obscuri text
            var text = obscuris.text;
            //get elements div size
            var divWidth = $('#elements').width();
            var divHeight = $('#elements').height();
            //get div padding
            var divPadding = $('#elements').css('padding-left');
            //get the difference between the div size and the display image size
            var diffWidth = divWidth - dispWidth;
            var diffHeight = divHeight - dispHeight;
            //subtract the difference from the obscuri dimensions and position
            dispObscuriX = dispObscuriX + diffWidth/2 + parseInt(divPadding);
            dispObscuriY = dispObscuriY + diffHeight/2 + parseInt(divPadding);
            dispObscuriWidth = dispObscuriWidth + diffWidth;
            dispObscuriHeight = dispObscuriHeight + diffHeight;
            //check if the screen size is less than or equal to 768px
            divX = 0;
            divY = 0;
            if($(window).width() <= 768){ 
                //get the position of the div and subtract it from the obscuri position and add the padding
                divX = $('#elements').offset().left;
                divY = $('#elements').offset().top;
                dispObscuriX = dispObscuriX - divX + 40;
            }

            //create obscuri div
            var obscuriDiv = $('<div class="obscuri"></div>').css({
                'position': 'absolute',
                'top': dispObscuriY + 'px',
                'left': dispObscuriX + divX + 'px',
                'width': dispObscuriWidth + 'px',
                'height': dispObscuriHeight + 'px',
                'background-color': bgColor,
                'color': textColor,
                'font-size': fontSize,
                'text-align': 'center',
                'vertical-align': 'middle',
                'border-radius': '5px',
                'margin-left': '5%',
                'font-family': fontFam,
            }).html(text);
            //append obscuri div to display image
            dispImage.append(obscuriDiv);
            //add obscuri div to elements div
            $('#elements').append(obscuriDiv);
        }
    }
}

function displayClickOverOptions(imgSrc, answers){
    //create dummy image of imageSrc
    var img = new Image();
    img.src = imgSrc;
    img.onload = function(){
        //get image dimensions
        var width = img.width;
        var height = img.height;
        //get display image
        var dispImage = $('#imageClickOver');
        //get dispImage dimensions
        var dispWidth = dispImage.width();
        var dispHeight = dispImage.height();
        //get ratio of image to display image
        var ratio = width/dispWidth;
        //remove all previous answers
        $('.answer').remove();
        //iterate through answers
        for(var i = 0; i < answers.length; i++){
            answer = answers[i];
            //get answer dimensions and position, removiting trailing px
            var answerWidth = answer.width.slice(0,-2);
            var answerHeight = answer.height.slice(0,-2);
            var answerX = answer.xCoord.slice(0,-2);
            var answerY = answer.yCoord.slice(0,-2);
            //get answer position on display image
            var dispAnswerX = answerX/ratio;
            var dispAnswerY = answerY/ratio;
            //get answer dimensions on display image
            var dispAnswerWidth = answerWidth/ratio;
            var dispAnswerHeight = answerHeight/ratio;
            //get answer font size, bgcolor, text color
            var fontSize = answer.fontSize;
            var bgColor = answer.bgColor;
            var textColor = answer.textColor;
            //get answer text
            var text = answer.answer;
            //get elements div size
            var divWidth = $('#elements').width();
            var divHeight = $('#elements').height();
            //get the difference between the div size and the display image size
            var diffWidth = divWidth - dispWidth - 48;
            var diffHeight = divHeight - dispHeight - 10;
            //convert to percentage
            var dispAnswerXPercent = dispAnswerX/divWidth * 100;
            var dispAnswerYPercent = dispAnswerY/dispHeight * 100;
            var dispAnswerWidthPercent = (dispAnswerWidth - diffWidth)/dispWidth * 100;
            var dispAnswerHeightPercent = dispAnswerHeight/dispHeight * 100;
            //get 5 percent of the screen width
            var fivePercent = $(window).width() * 0.05;
            //create answer div
            var answerDiv = $('<button class="answer btn continue overlay"></button>').css({
                'position': 'absolute',
                'top': dispAnswerYPercent + '%',
                'left': dispAnswerXPercent + '%',
                'width': dispAnswerWidthPercent  + '%',
                'height': dispAnswerHeightPercent + '%',
                'background-color': bgColor,
                'color': textColor,
                'font-size': fontSize,
                'text-align': 'center',
                'vertical-align': 'middle',
                'line-height': dispAnswerHeightPercent + '%',
                'margin-left': '5%',
            }).html(text).attr('id', i);
            //append answer div to display image
            dispImage.append(answerDiv);
            //add answer div to elements div
            $('#elements').append(answerDiv);
        }
    }
}




//call this function to wait for a time then call getAgentSpeech and readTTS
function startAgentSpeechTimer(template, min, max){
    //get student answering state
    var studentAnswering = template.studentAnswering.get();
    var promptQueued = template.promptQueued.get();
    //if student is not answering
    if(!studentAnswering && !promptQueued){
        //get random time between min and max
        randomTime = Math.floor(Math.random() * (max - min + 1) + min);
        //get current module
        var curModule = Modules.findOne();
        //get user firstname
        var user = Meteor.user().firstname;
        //set time to timeOut
        var type = "timeOut";
        //log to console
        console.log("timeOut set for " + randomTime + " seconds");
        //sleep for random time
        console.log("sleeping for " + randomTime + "miliseconds");
        sleep(randomTime).then(() => {
            //get agent speech
            var speech = getAgentSpeech(user, curModule, type, 0, 0, 0, 0, 0);
            //get agent art
            autoTutorReadsPrompt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts);
            autoTutorPromptCharacterVoice = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).voice;
            autoTutorPromptCharacterName = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).name;
            autoTutorPromptCaracterArt = moduleData.autoTutorCharacter.find(o => o.name == moduleData.characterReadsPrompts).art;
            //read agent speech
            readTTS(template, speech, autoTutorPromptCharacterVoice, autoTutorPromptCharacterName, autoTutorPromptCaracterArt);
            template.promptQueued.set(true);
        });
    }
}  


//call google api with speech bags
function getAgentSpeech(speakingTo, module, type, page, question, answerId, response, isCorrect){
    simpleFeedbackBag = module.simpleFeedbackBag || {correct: ["Good job {{speakingTo}}!", "Well done, {{speakingTo}}!"], incorrect: ["Not Quite, {{speakingTo}}.", "No, {{speakingTo}}."]};
    groupFeedbackBag = module.groupFeedbackBag || {correct: ["Good job {{speakingTo}}!", "Well done, {{speakingTo}}!"], incorrect: ["Not Quite, {{speakingTo}}.", "No, {{speakingTo}}."]};
    if(typeof module.pages[page].questions[question].answers[answerId].feedback !== "undefined"){
        elaboratedFeedback = module.pages[page].questions[question].answers[answerId].feedback;
    } else {
        elaboratedFeedback = "";
    }   
    elaboratedTrigger = Math.floor(Math.random() * 100);
    if(type == "feedback"){
        threshold = 50;
        feedback = "No feedback; Error in getAgentSpeech";
        if(module.feedbackThresholdCalculation){
            getThreshold = new Function(module.feedbackThresholdCalculation);
            threshold = getThreshold();
        } 
        if(module.feedbackThreshold){
            threshold = module.feedbackThreshold || threshold;
        }
        //check if speaking to is an array
        if(Array.isArray(speakingTo)){
            speakingTo = speakingTo.join(" and ");
            if(elaboratedTrigger < threshold){
                if(isCorrect){
                    simpleFeedback = groupFeedbackBag.correct[Math.floor(Math.random() * groupFeedbackBag.correct.length)];
                    combinedFeedback = simpleFeedback + " " + elaboratedFeedback;
                    feedback = combinedFeedback;
                } else {
                    simpleFeedback = groupFeedbackBag.incorrect[Math.floor(Math.random() * groupFeedbackBag.incorrect.length)];
                    combinedFeedback = simpleFeedback + " " + elaboratedFeedback;
                    feedback = combinedFeedback;
                }
            } else {
                if(isCorrect){
                    feedback = groupFeedbackBag.correct[Math.floor(Math.random() * groupFeedbackBag.correct.length)];
                } else {
                    feedback = groupFeedbackBag.incorrect[Math.floor(Math.random() * groupFeedbackBag.incorrect.length)];
                }
            }
        } else {
            if(elaboratedTrigger < threshold){
                if(isCorrect){
                    simpleFeedback = simpleFeedbackBag.correct[Math.floor(Math.random() * simpleFeedbackBag.correct.length)] || "{{speakingTo}} is correct.";
                    combinedFeedback = simpleFeedback + " " + elaboratedFeedback || "Correct";
                    feedback = combinedFeedback;
                } else {
                    simpleFeedback = simpleFeedbackBag.incorrect[Math.floor(Math.random() * simpleFeedbackBag.incorrect.length)] || "{{speakingTo}} is incorrect.";
                    combinedFeedback = simpleFeedback + " " + elaboratedFeedback || "Incorrect";
                    feedback = combinedFeedback;
                }
            } else {
                if(isCorrect){
                    feedback = simpleFeedbackBag.correct[Math.floor(Math.random() * simpleFeedbackBag.correct.length)] || "{{speakingTo}} is correct.";
                } else {
                    feedback = simpleFeedbackBag.incorrect[Math.floor(Math.random() * simpleFeedbackBag.incorrect.length)] || "{{speakingTo}} is incorrect.";
                }
            }
        }
        feedback = feedback.replace("{{speakingTo}}", speakingTo);
        feedback = feedback.replace("{{response}}", response);
        feedback = feedback.replace("{{user}}", Meteor.user().firstname);
        return feedback;
    }
    if(type == "response"){
        //get answer
        var answer = module.pages[page].questions[question].answers[response];
        if(answer.altAnswer){
            textResponse = answer.altAnswer;
        } else {
            textResponse = answer.answer;
        }
        bag1 = module.responseBag || ["I  think it is {{response}}.","{{response}} is my guess.", "{{response}}? I think so."];
        responseSpeech = bag1[Math.floor(Math.random() * bag1.length)];
        //remove periods, question marks, and exclamation points at the end of the response
        textResponse = textResponse.replace(/\.+$/, "");
        //remove trailing spaces
        textResponse = textResponse.replace(/\s{2,}/g," ");
        //add quotes to text response
        textResponse = '"' + textResponse + '"';
        //make text response first letter lowercase
        textResponse = textResponse.charAt(0).toLowerCase() + textResponse.slice(1);
        responseSpeech = responseSpeech.replace("{{response}}", textResponse);
        responseSpeech = responseSpeech.replace("{{speakingTo}}", speakingTo);
        responseSpeech = responseSpeech.replace("{{user}}", Meteor.user().firstname);
        //uppercase first letter
        responseSpeech = responseSpeech.charAt(0).toUpperCase() + responseSpeech.slice(1);
        return responseSpeech;
    }
    if(type == "timeOut"){
        bag1 = module.timeOutBag || ["Are you having trouble?","Are you still there?","Are you still with me?"];
        timeOutSpeech = bag1[Math.floor(Math.random() * bag1.length)];
        timeOutSpeech = timeOutSpeech.replace("{{response}}", response);
        timeOutSpeech = timeOutSpeech.replace("{{speakingTo}}", speakingTo);
        timeOutSpeech = timeOutSpeech.replace("{{user}}", Meteor.user().firstname);
        return timeOutSpeech;
    }
    return("Error in getAgentSpeech, type not found");
}