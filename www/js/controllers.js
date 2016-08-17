angular.module('ketogains.controllers', [])

.controller('LoginCtrl', function(LoginService, $ionicPopup, $firebaseAuth, $state, $cordovaOauth, $ionicModal, UserService, Auth) {

    var lc = this;

    var fb = new Firebase("https://ketogains-app.firebaseio.com");
    var auth = $firebaseAuth(fb);

    lc.data = {};

    $ionicModal.fromTemplateUrl('templates/signup.html', {
      this: lc
    }).then(function (modal) {
      lc.modal = modal;
    });

    Auth.$getAuth(function(authData) {
      if (authData === null) {
        console.log('Not logged in yet');
      } else {
        lc.authData = authData; // This will display the user's name in our view
        if (lc.authData) {
          var userToken = UserService.getUserToken();
          $http.get("https://graph.facebook.com/v2.2/me", { params: { access_token: userToken, fields: "id,name,gender,location,website,picture,relationship_status", format: "json" }}).then(function(result) {
            lc.profileData = result.data;
            console.log(lc.profileData);
          }, function(error) {
            alert("There was a problem getting your profile.  Check the logs for details.");
            console.log(error);
          });
        } else {
          $state.go("tab.macros");
        }
      }
    })

    lc.login = function() {
      LoginService.loginUser(lc.data.username, lc.data.password).success(function(data) {
        var alertPopup = $ionicPopup.alert({
          title: 'Welcome Ketogainer!',
          template: 'Please set your preferences in the "Profile" tab'
        });

        // Some fake testing data
        var user = {
          id: 0,
          name: 'Ben Sparrow',
          lastText: 'You on your way?',
          face: 'img/ben.png'
        };
        UserService.setUser(user);
        $state.go('tab.profile');

      }).error(function(data) {
        var alertPopup = $ionicPopup.alert({
          title: 'Login failed',
          template: 'Please check your credentials!'
        });
      });
    }

    lc.fbLogin = function(){
      if(!(ionic.Platform.isIOS() || ionic.Platform.isAndroid())){
        fb.authWithOAuthPopup("facebook", function(error, authData) {
          if (error) {
            console.log("Login Failed!", error);
          } else {
            UserService.setUserToken(authData.facebook.accessToken);
            console.log("Authenticated successfully with payload:", authData);
            lc.authData = authData;
            var alertPopup = $ionicPopup.alert({
              title: 'Hello',
              template: 'Welcome to Ketogains!'
            });
            $state.go('tab.macros');
          }
        });
      }
      //Native Login
      else {
        $cordovaOauth.facebook("1088809194533023", ["email","public_profile"]).then(function (result) {
          UserService.setUserToken(result.access_token);
          auth.$authWithOAuthToken("facebook", result.access_token).then(function(authData) {
            console.log(JSON.stringify(authData));
            var alertPopup = $ionicPopup.alert({
              title: 'Hello',
              template: 'Welcome to Ketogains!'
            });
            $state.go('tab.macros');
          }, function(error) {
            console.error("ERROR: " + error);
          });
        }, function(error) {
          console.log("ERROR: " + error);
        });
      }
    };

    lc.signupEmail = function(isValid){

        // check to make sure the form is completely valid
        if (isValid) {
          var ref = new Firebase("https://ketogains-app.firebaseio.com");

          ref.createUser({
            email    : lc.data.email,
            password : lc.data.password
          }, function(error, userData) {
            if (error) {
              console.log("Error creating user:", error);
            } else {
              console.log("Successfully created user account with uid:", userData.uid);
            }
          });
        }



    };

    lc.loginEmail = function(){

      Auth.authWithPassword({
        email    : lc.data.email,
        password : lc.data.password
      }, function(error, authData) {
        if (error) {
          console.log("Login Failed!", error);
        } else {
          console.log("Authenticated successfully with payload:", authData);
        }
      });

    };
  })

.controller('ProgressCtrl', function() {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //

  var pgc = this;

  pgc.progress = {
    labels: ["January", "February", "March", "April", "May", "June", "July"],
    series: ['Series A', 'Series B'],
    data: [
      [65, 59, 80, 81, 56, 55, 40],
      [28, 48, 40, 19, 86, 27, 90]
    ]
  };

  pgc.onMacroClick = function (points, evt) {
      console.log(points, evt);
  };

})

.controller('ProgressDetailCtrl', function( $stateParams) {
  var pdc = this;

  pdc.chat = Chats.get($stateParams.chatId);

})

.controller('MacrosCtrl', function($stateParams, $ionicPopup, $state, UserService, Auth, $http) {
    var mc = this;

    var authData = Auth.$getAuth();

    if (authData) {
      console.log("Logged in as:", authData.uid);
      console.log(authData);
      mc.authData = authData; // This will display the user's name in our view
      if(mc.authData) {
        var userToken = UserService.getUserToken();
        $http.get("https://graph.facebook.com/v2.2/me", { params: { access_token: userToken, fields: "id,name,gender,location,website,picture,relationship_status", format: "json" }}).then(function(result) {
          mc.profileData = result.data;
          console.log(mc.profileData);

        }, function(error) {
          alert("There was a problem getting your profile.  Check the logs for details.");
          console.log(error);
        });

        mc.macros = {
          labels: ['Protein', 'Fat', 'Carbs'],
          data: [196, 60, 25],
          options: {
            responsive: false,
            legend:{
              display: true,
            },
            tooltips:{
              mode: 'single',
              callbacks: {
                label: function(tooltipItem, data) {
                  var allData = data.datasets[tooltipItem.datasetIndex].data;
                  var tooltipLabel = data.labels[tooltipItem.index];
                  var tooltipData = allData[tooltipItem.index];
                  var total = 0;
                  for (var i in allData) {
                    total += allData[i];
                  }
                  var tooltipPercentage = Math.round((tooltipData / total) * 100);
                  return tooltipData + 'g ' + tooltipLabel + ' (' + tooltipPercentage + '%)';
                }
              }
            }
          }
        }
      } else {
        $state.go("login");
      }
    } else {
      console.log("Logged out");
      $state.go("login");
    }

})

.controller('ProfileCtrl', function($scope, $ionicModal) {

    $scope.profile = {
      weightUnit: 'lbs',
      weight: 0,
      bodyFat: 20.0
    };

    $scope.openModal = function() {
      $scope.bodyFatCtrl.show();
    };

    $scope.closeModal = function() {
      $scope.bodyFatCtrl.hide();
    };

    $ionicModal.fromTemplateUrl('templates/bodyfat-estimate.html', function(modal) {
      $scope.bodyFatCtrl = modal;
    }, {
      scope: $scope,
      animation: 'slide-in-up',
    });
  })

.controller('BodyFatModalCtrl', function($scope) {
  $scope.hideModal = function() {
    $scope.bodyFatCtrl.hide();
  };
});
