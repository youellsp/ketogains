// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services','ngCordova','ngCordovaOauth','firebase'])


.run(function($ionicPlatform, $ionicPopup, $ionicLoading, $rootScope, Auth, UserService, $state) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    Auth.$onAuth(function (authData) {
      $ionicLoading.show();
      if (authData) {
        if(authData.provider == 'facebook'){
          UserService.setUserToken(authData.facebook.accessToken);
        }
        $state.go('tab.macros');
        $ionicLoading.hide();
      } else {
        console.log("Logged out");
        $ionicLoading.hide();
        $state.go('login');
      }
    })

    $rootScope.logout = function () {
      console.log("Logging out from the app");
      showConfirm();
      // A confirm dialog
      function showConfirm(){
        var confirmPopup = $ionicPopup.confirm({
          title: 'Logout',
          template: 'Are you sure you want to log out?'
        });

        confirmPopup.then(function(res) {
          if(res) {
            Auth.$unauth();
            console.log('User is sure they want to log out');
          } else {
            console.log('User cancelled log out');
            $state.go('tab.macros');
          }
        });
      }
    }

    $rootScope.$on("$stateChangeError", function (event, toState, toParams, fromState, fromParams, error) {
      // We can catch the error thrown when the $requireAuth promise is rejected
      // and redirect the user back to the home page
      if (error === "AUTH_REQUIRED") {
        $state.go('login');
      }
    });

  });

})

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // Main login window
    .state('login', {
      url: '/login',
      templateUrl: 'templates/login.html',
      controller: 'LoginCtrl as lc',
      resolve: {
        // controller will not be loaded until $waitForAuth resolves
        // Auth refers to our $firebaseAuth wrapper in the example above
        "currentAuth": ['Auth',
          function (Auth) {
            // $waitForAuth returns a promise so the resolve waits for it to complete
            return Auth.$waitForAuth();
          }]
      }
    })

  // setup an abstract state for the tabs directive
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'templates/tabs.html',
    resolve: {
      // controller will not be loaded until $requireAuth resolves
      // Auth refers to our $firebaseAuth wrapper in the example above
      "currentAuth": ['Auth',
        function (Auth) {
          // $requireAuth returns a promise so the resolve waits for it to complete
          // If the promise is rejected, it will throw a $stateChangeError (see above)
          return Auth.$requireAuth();
        }]
    }
  })

  // Each tab has its own nav history stack:

  .state('tab.macros', {
    url: '/macros',
    views: {
      'tab-macros': {
        templateUrl: 'templates/tab-macros.html',
        controller: 'MacrosCtrl as mc'
      }
    }
  })

  .state('tab.progress', {
      url: '/progress',
      views: {
        'tab-progress': {
          templateUrl: 'templates/tab-progress.html',
          controller: 'ProgressCtrl as pgc'
        }
      }
    })

    .state('tab.progress-detail', {
      url: '/progress/:chatId',
      views: {
        'tab-progress': {
          templateUrl: 'templates/progress-detail.html',
          controller: 'ProgressDetailCtrl as pdc'
        }
      }
    })

  .state('tab.profile', {
    url: '/profile',
    views: {
      'tab-profile': {
        templateUrl: 'templates/tab-profile.html',
        controller: 'ProfileCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/login');

});
