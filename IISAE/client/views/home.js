import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.home.helpers({
    'userIsUser' : () => Roles.userIsInRole(Meteor.userId(), 'user'),
});

Template.home.events({
})