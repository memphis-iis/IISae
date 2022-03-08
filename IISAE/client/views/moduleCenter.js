Template.moduleCenter.helpers({
    'modules': function(){
        mod = Modules.find({}).fetch()
        return mod;
    }
})
Template.moduleCenter.events({
    'click .startModule': function(event){
        event.preventDefault();
        target = "/module/" + event.target.id;
        window.location.href = target;
    },
})
Template.moduleCenter.onCreated(function() {
    Meteor.subscribe('modules');
})