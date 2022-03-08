Template.assessmentEditor.helpers({
    'questions': function(){
    },
    'assessment': function() {
        assessmentId = this.assessmentid; 
        assessment = Assessments.findOne({_id: assessmentId});
        answersCombined = [];
        questionsCombined = [];
        questionsReversed = assessment.reversedQuestions;
        for(i = 0; i < assessment.answers.length; i++){
            answersCombined.push({
                id: i,
                answer: assessment.answers[i],
                value: assessment.answerValues[i],
                reversedValue: assessment.reversedValues[i]
            })
        }
        for(j = 0; j < assessment.questions.length; j++){
            assessment.questions[j].id = j;
            subscalesCombined = [];
            for(k = 0; k < assessment.questions[j].subscales.length; k++){
                subscalesCombined.push({
                    id: k,
                    subscale: assessment.questions[j].subscales[k],
                    parent: j
                });
            }
            reversed = false;
            if(questionsReversed.indexOf(j) !== -1){
                reversed = true;
            }
            questionsCombined.push({
                text: assessment.questions[j].text,
                id: j,
                subscalesCombined: subscalesCombined,
                reversedValueEnabled: reversed
            })
        }
        assessment.organization = Orgs.findOne({_id: Meteor.user().organization}).orgName;
        assessment.questionsCombined = questionsCombined
        assessment.answersCombined = answersCombined;
        return assessment;
    },
    'json': function(){
        assessmentId = this.assessmentid; 
        assessment = Assessments.findOne({_id: assessmentId});
        return JSON.stringify(assessment, null, 2);
    },
});

Template.assessmentEditor.events({
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
        assessmentId = $('#assessmentId').val();
        state = $('#switch').html();
        if(state == "false"){
            result = "true";
        } else {
            result = "false";
        }
        changeAssessment(assessmentId, "display", result);
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
        assessmentId = $('#assessmentid').val();
        changeAssessment(assessmentId, field, result);
        $('#clone').remove();
    },
    'click #delete-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        assessmentId = $('#assessmentid').val();
        deleteAssessmentItem(assessmentId, field);
    },
    'click #add-item': function(event){
        event.preventDefault();
        field = event.target.getAttribute('data-field');
        result = "\"" + $('#clone #input-editor').val() + "\"";
        assessmentId = $('#assessmentid').val();
        addAssessmentItem(assessmentId, field);
    },
    'change .reversedValueSwitch': function(event){
        event.preventDefault();
        assessmentId = $('#assessmentid').val();
        field = "reversedQuestions";
        result = event.target.getAttribute('data-question');
        changeAssessment(assessmentId, field, result);
    }
})

Template.assessmentEditor.onCreated(function() {
    Meteor.subscribe('assessments');

})

Template.assessmentEditor.onCreated(function(){
    this.assessmentIdentifier = new ReactiveVar();
})

function changeAssessment(assessmentId, field, result){
    Meteor.call('changeAssessment', {
        assessmentId: assessmentId,
        field: field,
        result: result,
    })
}

function deleteAssessmentItem(assessmentId, field){
    Meteor.call('deleteAssessmentItem', {
        assessmentId: assessmentId,
        field: field,
    })
}

function addAssessmentItem(assessmentId, field){
    Meteor.call('addAssessmentItem', {
        assessmentId: assessmentId,
        field: field,
    })
}

