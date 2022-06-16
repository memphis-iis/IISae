import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor'

//Define Collections
Orgs = new Meteor.Collection('organizations');
Modules = new Meteor.Collection('modules');
ModuleResults = new Meteor.Collection('modresults');
Events = new Meteor.Collection('events');
AutoTutorCharacters = new Mongo.Collection('autoTutorCharacters');
LSASpaces = new Meteor.Collection('lsaSpaces');
Classes = new Mongo.Collection('classes');

//Init DynamicAssets Collection
FileStore = new FilesCollection({
    collectionName: 'FileStore',
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
      // Allow upload files under 10MB, and only in png/jpg/jpeg formats
      if (file.size <= 10485760 && /json|png|jpg|jpeg|webm/i.test(file.extension)) {
        return true;
      }
      return 'Please upload image, with size equal or less than 10MB';
    }
  });