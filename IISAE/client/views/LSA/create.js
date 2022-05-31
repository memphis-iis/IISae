Template.lsacreate.helpers({
    'corperas': function(){
        corperas = LSASpaces.find({}).fetch();
        return corperas;
    }
});

Template.lsacreate.events({
    'click #create-corpera': function(e){
        e.preventDefault();
        spaceName = $('#corperaName').val();
        Meteor.call('createCorpera',spaceName);
    },
    'click #add-corpus': function(e){
        e.preventDefault();
        id =$('#corperaToAppendTo').val();
        text =$('#corpusText').val();
        text = text.replace(".","");
        Meteor.call('addCorpus',id, text);
    },
    'click #test-response': function(e){
        e.preventDefault();
        id =$('#corpusToTextAgainst').val();
        text =$('#responseText').val();
        Meteor.call('testResponse',id, text, function(err, res){
            $('#eucdist').val(res.distance_from_cluster_center);
            $('#cossim').val(res.cos_similarity);
        });
    },
})

Template.lsacreate.onCreated(function() {
    Meteor.subscribe('corperas');
})

