Template.moduleEditor.helpers({
    'module': function() {
        moduleId = this.moduleId; 
        curModule = Modules.findOne({_id: moduleId});
        pages = curModule.pages;
        curModule.pageFlowVarNames = Object.keys(curModule.pageFlowVars);
        for(i = 0; i < pages.length; i++){
            pages[i].isActivity = false;
            pages[i].isEmbed = false;
            nextFlowParms = pages[i].nextFlow;
            for(j=0;j < nextFlowParms.length; j++){
                pages[i].nextFlow[j].parent=i;
                pages[i].nextFlow[j].pageFlowVars = Object.keys(curModule.pageFlowVars);
                pages[i].nextFlow[j].pageList = pages;
                
            }
            if(pages[i].type == "embed"){
                pages[i].isEmbed = true;
            }
            if(pages[i].type == "activity"){
                pages[i].isActivity = true;
                if(typeof pages[i].questions !== "undefined"){
                    questions = pages[i].questions;
                    for(j=0;j < questions.length; j++){
                        questions[j].parent = i;
                        questions[j].showTextOptions = true;
                        questions[j].isCombo = false;
                        questions[j].isMultiChoice = false;
                        questions[j].isQuestionSelectBoard = false;
                        questions[j].isWordBank = false;
                        questions[j].enableLSA = curModule.enableLSA;
                        if(questions[j].autoTutorScript){
                            autoTutorScripts = pages[i].questions[j].autoTutorScript;
                            for(k=0;k < autoTutorScripts.length; k++){
                                pages[i].questions[j].autoTutorScript[k].page = i;
                                pages[i].questions[j].autoTutorScript[k].parent= j;
                                pages[i].questions[j].autoTutorScript[k].characterChoices = curModule.autoTutorCharacter;
                            }
                        }
                        if(questions[j].type == "combo"){ 
                            questions[j].isCombo = true;
                            questions[j].showTextOptions = false;
                            if(typeof questions[j].fields !== "undefined"){
                                fields = questions[j].fields;
                                for(k=0;k < fields.length;k++){
                                    fields[k].showTextOptions = true;
                                    fields[k].page = i;
                                    fields[k].parent = j;
                                    fields[k].isMultiChoice = false;
                                    if(fields[k].type == "multiChoice"){
                                        fields[k].isMultiChoice = true;
                                        fields[k].showTextOptions = false;
                                        if(typeof fields[k].answers !== "undefined"){
                                            answers = fields[k].answers;
                                            for(l=0;l < answers.length; l++){
                                                answers[l].page = i;
                                                answers[l].question = j;
                                                answers[l].parent = k;
                                            }
                                        }
                                    }
                                }
                            }
                        } 
                        if(questions[j].type == "questionSelectionBoard"){
                            questions[j].isQuestionSelectBoard = true;
                        }
                        if(questions[j].type == "multiChoice"){
                            answers = questions[j].answers;
                            questions[j].isMultiChoice = true;
                            questions[j].showTextOptions = false;
                            if(typeof answers !== "undefined"){
                                for(k = 0; k < answers.length; k++){
                                    answers[k].parent = j;
                                    answers[k].page = i;
                                }
                            }
                        }
                        if(questions[j].type == "wordbank"){
                            answers = questions[j].answers;
                            questions[j].isWordBank = true;
                            questions[j].showTextOptions = false;
                            if(typeof answers !== "undefined"){
                                for(k = 0; k < answers.length; k++){
                                    answers[k].parent = j;
                                    answers[k].page = i;
                                }
                            }
                        }
                        if(questions[j].answerCorpera){
                            answers = questions[j].answerCorpera;
                            if(typeof answers !== "undefined"){
                                for(k = 0; k < answers.length; k++){
                                    answers[k].parent = j;
                                    answers[k].page = i;
                                }
                            }
                        }
                    }
                }
            }
            if(pages[i].autoTutorScript){
                autoTutorScripts = pages[i].autoTutorScript;
                for(j=0;j < autoTutorScripts.length; j++){
                    pages[i].autoTutorScript[j].parent = i;
                    pages[i].autoTutorScript[j].characterChoices = curModule.autoTutorCharacter;
                }
            }
        }
        console.log(curModule);
        return curModule;
    },
    'json': function(){
        moduleId = this.moduleId; 
        curModule = Modules.findOne({_id: moduleId});
        return JSON.stringify(curModule, null, 2);
    },
    'AutoTutorCharacters': function(){
                
        return AutoTutorCharacters.find({}).fetch();
    },
});

Template.moduleEditor.events({
   'click #show-json': function(event) {
        $('#json').show();
        $('#hide-json').show();
        $('#show-json').hide();
    },
    'click #hide-json': function(event) {
        $('#json').hide();
        $('#show-json').show();
        $('#hide-json').hide();
    },
    'click #switch-display': function(event){
        moduleId = $('#moduleId').val();
        state = $('#switch').html();
        if(state == "false"){
            result = "true";
        } else {
            result = "false";
        }
        changeModule(moduleId, "display", result);
    },
    'click #open-editor': function(event){
        $('#clone').remove();
        field = event.target.getAttribute('data-field');
        value = event.target.getAttribute('data-value');
        if(event.target.getAttribute('data-target') == null){
            cloneTo = event.target;
        } else {
            cloneTo = "#" + event.target.getAttribute('data-target')
            $(cloneTo).hide();
        }
        $("#input-editor").val(value);
        $("#text-editor").clone().attr("id","clone").show().insertAfter(cloneTo);
        $('#clone button').attr("data-field",field).attr('data-target', cloneTo);
    },
    'click #button-save': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        cloneTo = event.target.getAttribute('data-target');
        $(cloneTo).show();
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        changeModule(moduleId, field, result);
        $('#clone').remove();
    },
    'click #button-save-direct': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        resultToReplace = $('#textarea-editor').val();
        result = "\"" + resultToReplace.replace(/"/g, '\\"') + "\"";
        alert(result);
        moduleId = $('#moduleId').val();
        changeModule(moduleId, field, result);
    },
    'change .combo-save': function(event){
        field = event.target.getAttribute('data-field');
        result = "\"" + event.target.value + "\"";
        moduleId = $('#moduleId').val();
        changeModule(moduleId, field, result);
    },
    'click #delete-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        deleteModuleItem(moduleId, field);
    },
    'click #add-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        moduleId = $('#moduleId').val();
        addModuleItem(moduleId, field);
    },
    'change .markCorrect': function(event){
        event.preventDefault();
        moduleId = $('#moduleId').val();
        field = event.target.getAttribute('data-field');
        result = event.target.getAttribute('data-value');
        changeModule(moduleId, field, result);
    }
})

Template.moduleEditor.onCreated(function() {
    Meteor.subscribe('modules');

})

Template.moduleEditor.onCreated(function(){
    this.assessmentIdentifier = new ReactiveVar();
})

function changeModule(moduleId, field, result){
    Meteor.call('changeModule', {
        moduleId: moduleId,
        field: field,
        result: result,
    })
}

function deleteModuleItem(moduleId, field){
    Meteor.call('deleteModuleItem', {
        moduleId: moduleId,
        field: field,
    })
}

function addModuleItem(moduleId, field){
    Meteor.call('addModuleItem', {
        moduleId: moduleId,
        field: field,
    })
}

