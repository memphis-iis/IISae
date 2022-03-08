import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor'

//Define Collections
Orgs = new Mongo.Collection('organizations');
Assessments  = new Mongo.Collection('assessments');
Trials = new Mongo.Collection('trials');
Modules = new Mongo.Collection('modules');
ModuleResults = new Mongo.Collection('modresults');
Events = new Mongo.Collection('events');

//Init DynamicAssets Collection
Images = new FilesCollection({
    collectionName: 'Images',
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
      // Allow upload files under 10MB, and only in png/jpg/jpeg formats
      if (file.size <= 10485760 && /png|jpg|jpeg/i.test(file.extension)) {
        return true;
      }
      return 'Please upload image, with size equal or less than 10MB';
    }
  });