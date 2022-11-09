import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.htmlModal.onCreated(function() {

});

Template.htmlModal.events({
    
});

Template.htmlModal.helpers({
    'html': function(){
        return Session.get('modalHTMLContent');
    }
});