import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.code.events({
    'click #signup-route': function() {
        event.preventDefault();
        target = "/signup/" + $('#code').val(),
        Router.go(target)
    },
    'click #home-route': function() {
        event.preventDefault();
        Router.go('/')
    }
})