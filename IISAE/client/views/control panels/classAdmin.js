import { Template }    from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';

Template.classAdmin.helpers({
    'classes':function(){
        return Classes.find().fetch();
    },
    'module': function(){
        data = Modules.find().fetch();
        return data;
    },
    'selectedClass': function(){
        const t = Template.instance();
        selectedClass = t.classSelected.get();
        if(selectedClass == "false"){
            return false;
        }
        thisClass =  Classes.findOne({"_id": selectedClass});
        if(thisClass.students.length == 0){
            thisClass.students = false;
        }
        console.log("students", thisClass.students);
        for(let index in thisClass.flow){
            if(parseInt(index) == 0){
                thisClass.flow[index].first = true;
            }
            if(parseInt(index) == thisClass.flow.length - 1){
                thisClass.flow[index].last = true;
            }
        }
        return thisClass;
    },
    'organization': () => Orgs.findOne(),
    
})

Template.classAdmin.events({
    'click #moveup-assignment': function(event){
        org = Orgs.findOne({_id: Meteor.user().organization});
        index = $(event.target).data("index");
        assigned = org.newUserAssignments;
        a = assigned[index];
        b = assigned[index - 1];
        assigned[index] = b;
        assigned[index - 1] = a;
        Meteor.call('changeAssignmentToNewUsers', assigned);
    },
    'click #movedown-assignment': function(event){
        org = Orgs.findOne({_id: Meteor.user().organization});
        index = $(event.target).data("index");
        assigned = org.newUserAssignments;
        a = assigned[index];
        b = assigned[index + 1];
        assigned[index] = b;
        assigned[index + 1] = a;
        Meteor.call('changeAssignmentToNewUsers', assigned);
    },
    'click #new-class': function(event){
        Meteor.call('createClass');
    },
    'click #delete-class': function(event){
        classId = $(event.target).data("class");
        Meteor.call('deleteClass',classId);
    },
    'click #copy-class': function(event){
        classId = $(event.target).data("class");
        Meteor.call('copyClass',classId);
    },
    'change #selectClass': function(event){
        const t = Template.instance();
        t.classSelected.set(event.target.value);
    },
    'click #changeClassName': function(event){
        const t = Template.instance();
        classId = t.classSelected.get();
        newName = document.getElementById('className').value 
        Meteor.call('changeClassName',classId,newName)
        
    },
    'click #assign-module': function(event){
        const t = Template.instance();
        selectedClass = t.classSelected.get();
        addedModule = $(event.target).data("module-id");
        Meteor.call('assignModuleToClass',selectedClass,addedModule);
    },
    'click #assign-module-practice': function(event){
        const t = Template.instance();
        selectedClass = t.classSelected.get();
        addedModule = $(event.target).data("module-id");
        isPractice = true;
        Meteor.call('assignModuleToClass',selectedClass,addedModule,isPractice);
    },
    'click #remove-module': function(event){
        const t = Template.instance();
        selectedClass = t.classSelected.get();
        removeModule = $(event.target).data("index");
        Meteor.call('removeModuleFromClass',selectedClass,removeModule);
    },
    'click #moveup-module': function(event){
        event.preventDefault();
        const t = Template.instance();
        classId = t.classSelected.get();
        curClass = Classes.findOne({_id: classId});
        index = $(event.target).data("index");
        assigned = curClass.flow;
        a = assigned[index];
        b = assigned[index - 1];
        assigned[index] = b;
        assigned[index - 1] = a;
        curClass.flow = assigned;
        Meteor.call('changeClassAssignment', classId, curClass.flow);
    },
    'click #movedown-module': function(event){
        event.preventDefault();
        const t = Template.instance();
        classId = t.classSelected.get();
        curClass = Classes.findOne({_id: classId});
        index = $(event.target).data("index");
        assigned = curClass.flow;
        a = assigned[index];
        b = assigned[index  + 1];
        console.log(index,a,b);
        assigned[index] = b;
        assigned[index + 1] = a;
        curClass.flow = assigned;
        Meteor.call('changeClassAssignment', classId, curClass.flow);
    },
    
})

Template.classAdmin.onCreated(function() {
    Meteor.subscribe('modules');
    Meteor.subscribe('getClasses');
    this.classSelected = new ReactiveVar(false);
})