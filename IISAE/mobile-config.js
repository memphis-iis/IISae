// This section sets up some basic app metadata, the entire section is optional.
App.info({
    id: 'com.uofmiis.issae',
    name: 'ISSAE',
    description: 'IIS Assessment Engine',
    author: 'UofM Institute for Intelligent Systems'
  });
  
  // Set PhoneGap/Cordova preferences.
  App.setPreference('BackgroundColor', '0xff0000ff');
  App.setPreference('HideKeyboardFormAccessoryBar', true);
  App.setPreference('Orientation', 'default');
  App.setPreference('Orientation', 'all', 'ios');
  
  App.configurePlugin('phonegap-plugin-push', {
    SENDER_ID: 'xxxxxxxxxxxxxxxx'
  })
  
  App.appendToConfig(`

  `)