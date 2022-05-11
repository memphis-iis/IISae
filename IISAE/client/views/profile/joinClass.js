import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';

Template.joinClass.events({
    'click #joinClass': function(event) {
        event.preventDefault();
        code = $('#code').val();
        Meteor.call('joinClassByCode',code,function(err,res){
            if(err){
                alert("Class was not found");
            }
        });
        Router.go('/profile')
    },
    'click #home-route': function(event) {
        event.preventDefault();
        Router.go('/profile')
    }
})