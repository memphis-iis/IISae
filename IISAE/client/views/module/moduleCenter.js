Template.moduleCenter.helpers({
    'modules': function(){
        mod = Modules.find({}).fetch()
        return mod;
    },
    'classes':function(){
        classList = Meteor.user().classList || [];
        if(!classList){
            return false
        } else {
            classes = [];
            for(let course of classList){
                classId = course.classId;
                thisClass = Classes.findOne({"_id":classId});
                thisClass.hasModules = true;
                if(thisClass.flow.length == 0){
                    thisClass.hasModules = false;
                }
                thisClass.moduleList = [];
                classes.push(thisClass);
            }
            console.log(classes);
            return classes;
        }
    }
})
Template.moduleCenter.events({
    'click .startModule': function(event){
        event.preventDefault();
        //get data-module
        let index = event.target.getAttribute("data-index");
        //get module that matches index
        let moduleId = Modules.find().fetch();
        moduleId = moduleId[index]._id;
        target = "/module/" + moduleId;
        window.location.href = target;
    },
})
Template.moduleCenter.onCreated(function() {
    Meteor.subscribe('modules');
    Meteor.subscribe('getClasses');
})