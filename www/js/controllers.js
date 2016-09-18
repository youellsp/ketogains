angular.module('ketogains.controllers', [])

.controller('LoginCtrl', function($rootScope, $scope, LoadingService, LoginService, $ionicPopup, $firebaseAuth, $state, $cordovaOauth, $ionicModal, Auth) {

    var lc = this;

    $scope.$on("$ionicView.afterEnter", function(event, data){
      Auth.$getAuth(function(authData) {
        if (authData === null) {
          console.log('Not logged in yet');
        } else {
          $http.get("https://graph.facebook.com/v2.2/me", {
            params: {
              access_token: authData.facebook.accessToken,
              fields: "id,name,gender,location,website,picture,relationship_status",
              format: "json"
            }
          }).then(function (result) {
            lc.profileData = result.data;
            console.log(lc.profileData);
          }, function (error) {
            alert("There was a problem getting your profile.  Check the logs for details.");
            console.log(error);
          });
        }
      });
    })

    $ionicModal.fromTemplateUrl('templates/signup.html', {
      this: lc
    }).then(function (modal) {
      lc.modal = modal;
    });

    lc.emailLogin = function(user) {
      LoadingService.showLoading("Logging In...");
      Auth.$authWithPassword({
        email    : user.email,
        password : user.password
      }, function(error, authData) {
        if (error) {
          var alertPopup = $ionicPopup.alert({
            title: 'Login Failed',
            template: 'Please check your credentials!'
          });
        }
      });
    }

    lc.fbLogin = function(){
      LoadingService.showLoading("Logging In...");
      if(!(ionic.Platform.isIOS() || ionic.Platform.isAndroid())){
        Auth.$authWithOAuthPopup("facebook", function(error, authData) {
          if (error) {
            console.log("Login Failed!", error);
            var promise = LoadingService.hideLoading('tab.macros');
            promise.then(function(){
              var alertPopup = $ionicPopup.alert({
                title: 'Facebook Login Failed',
                template: error
              });
            });
          } else {
            console.log("Authenticated successfully with payload:", authData);
            lc.authData = authData;
            LoadingService.showLoading("Logging In..");
          }
        });
      }
      //Native Login
      else {
        $cordovaOauth.facebook("1088809194533023", ["email","public_profile"]).then(function (result) {
          Auth.$authWithOAuthToken("facebook", result.access_token).then(function(authData) {
            LoadingService.showLoading("Logging In..");
            console.log("Firebase authData => " + JSON.stringify(authData));
          }, function(error) {
            console.error("ERROR: auth.$authWithOAuthToken : " + error);
            var promise = LoadingService.hideLoading();
            promise.then(function(){
              var alertPopup = $ionicPopup.alert({
                title: 'Facebook Login Failed',
                template: error
              });
            });
          });
        }, function(error) {
          console.log("ERROR: $cordovaOauth.facebook : " + error);
          var promise = LoadingService.hideLoading('tab.macros');
          promise.then(function(){
            var alertPopup = $ionicPopup.alert({
              title: 'Facebook Login Failed',
              template: error
            });
          });
        });
      }
    };
})

.controller('ProgressCtrl', function($rootScope, $scope, Auth) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //


  $scope.progress = [];

  if ($scope.authData) {

    $scope.progressChart = {
      labels: ["January", "February", "March", "April", "May", "June", "July"],
      series: ['Weight', 'Bodyfat'],
      data: [
        [65, 59, 80, 81, 56, 55, 40],
        [28, 48, 40, 19, 86, 27, 90]
      ]
    };
  }

  $scope.onMacroClick = function (points, evt) {
    console.log(points, evt);
  };

})

.controller('ProgressDetailCtrl', function($stateParams) {
  var pdc = this;

  pdc.chat = Chats.get($stateParams.chatId);

})

.controller('MacrosCtrl', function($rootScope, LoadingService, $firebaseObject, $stateParams, $scope, $ionicPopup, $state, getFirebaseObject, Auth, $http, $ionicSlideBoxDelegate) {
    var mc = this;
      $scope.$on("$ionicView.beforeEnter", function(event, data){
        // handle event
        console.log("State Params: ", data.stateParams);
        //attach current profile info to scope
        mc.authData = Auth.$getAuth();

        if (mc.authData === null) {
          mc.macros = null;
          mc.profile = null;
        }else{
          var macros = getFirebaseObject(mc.authData.uid, 'macros');
          macros.$loaded().then(function(){
            console.log("MACROS", macros);
            mc.macros = macros;

            if (!(mc.macros.hasOwnProperty('goal'))){
              mc.macros.goal = 'LOSE';
              mc.macros.deficit = 10;
              mc.macros.surplus = 0;
            }
            if (!(mc.macros.hasOwnProperty('proteinRatio'))){
              mc.macros.proteinRatio = 100;
            }
            if (!(mc.macros.hasOwnProperty('protocol'))){
              mc.macros.protocol = 'SKD';
            }
            recalculateMacros(false);
            mc.macros.$save();
          })

          var profile = getFirebaseObject(mc.authData.uid, 'profile');
          profile.$loaded().then(function(){
            console.log("PROFILE", profile);
            mc.profile = profile;

            if(mc.authData.provider == 'facebook') {
              $http.get("https://graph.facebook.com/v2.2/me", {
                params: {
                  access_token: mc.authData.facebook.accessToken,
                  fields: "id,name,gender,location,website,picture,relationship_status",
                  format: "json"
                }
              }).then(function (result) {
                mc.profile.facebookProfileData = result.data;
                mc.profile.picture = mc.profile.facebookProfileData.picture.data.url;
                mc.profile.$save();
                console.log("facebookProfileData", mc.profile.facebookProfileData);

                if (!(mc.profile.hasOwnProperty('fullName'))){
                  mc.profile.fullName = mc.profile.facebookProfileData.name;
                }

              }, function (error) {
                alert("There was a problem getting your profile.  Check the logs for details.");
                console.log(error);
              });
            }

            if (mc.profile.hasOwnProperty('fullName')){
              var nameArray = mc.profile.fullName.split(" ");
              mc.firstName = nameArray[0];
            }else{
              mc.firstName = "Ketogainer";
            }

            if (!(mc.profile.hasOwnProperty('picture'))){
              mc.profile.picture = "img/default.png";
            }

            if (!(mc.profile.hasOwnProperty('bmr'))){
              var alertPopup = $ionicPopup.alert({
                title: 'Ketogains App Beta v0.1',
                template: 'Welcome to the Ketogains app beta! ' +
                'In order to calculate and optimize your macros for a ketogenic diet, ' +
                'first we need to know a little information about you and your body'
              });
              //$state.go('tab.profile');
            }

          })
        }
      });

      $scope.$on("$ionicView.enter", function(event, data){
        recalculateMacros(false);
        LoadingService.hideLoading();
      });

      mc.protocols = [
        {name: 'Standard Keto Diet (SKD)', value: 'SKD'},
        {name: 'Targeted Keto Diet (TKD)', value: 'TKD'},
        {name: 'Cyclic Keto Diet (CKD)', value: 'CKD'}
      ];

      mc.changeGoal = function() {
        if (mc.macros.goal == 'LOSE') {
          mc.macros.surplus = 0;
          mc.macros.deficit = 10;
        } else if (mc.macros.goal == 'MAINTAIN') {
          mc.macros.surplus = 0;
          mc.macros.deficit = 0;
        } else if (mc.macros.goal == 'GAIN') {
          mc.macros.surplus = 10;
          mc.macros.deficit = 0;
        }

        mc.save();
      }

      mc.save = function(){
        mc.macros.$save();
        mc.profile.$save();
        var animation = false;
        recalculateMacros(animation);
      }

      mc.changeProtocol = function () {
        var animation = true;
        recalculateMacros(animation);
        $ionicSlideBoxDelegate.update();
      }

      function recalculateMacros(animation) {
        var tooltip = function (tooltipItem, data) {
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

        mc.macrosGraph = {
          labels: ['Protein', 'Fat', 'Carbs'],
          data: [196, 60, 25],
          options: {
            responsive: false,
            colours: ["rgba(224, 108, 112, 1)",
              "rgba(224, 108, 112, 1)",
              "rgba(224, 108, 112, 1)"
            ],
            legend: {
              display: true,
            },
            tooltips: {
              mode: 'single',
              callbacks: {
                label: tooltip
              }
            }
          }
        }

        mc.macrosGraphCarbDay = {
          labels: ['Protein', 'Fat', 'Carbs'],
          data: [250, 15, 300],
          colors: ["rgba(224, 108, 112, 1)",
            "rgba(224, 108, 112, 1)",
            "rgba(224, 108, 112, 1)"],
          options: {
            responsive: false,
            legend: {
              display: true,
            },
            animation: animation,
            tooltips: {
              mode: 'single',
              callbacks: {
                label: tooltip
              }
            }
          }
        }
        $ionicSlideBoxDelegate.update();
      }

      recalculateMacros(false);

})

.controller('ProfileCtrl', function($rootScope, $http, $firebaseObject, getFirebaseObject, $scope, $ionicModal, Auth) {

      $scope.$on("$ionicView.beforeEnter", function(event, data) {
        //attach current profile info to scope
        $scope.authData = Auth.$getAuth();

        if ($scope.authData != null) {
          var profile = getFirebaseObject($scope.authData.uid, 'profile');
          console.log("FB PROFILE", profile);
          $scope.profile = profile;

          if ($scope.authData.provider == 'facebook') {
            $http.get("https://graph.facebook.com/v2.2/me", {
              params: {
                access_token: $scope.authData.facebook.accessToken,
                fields: "id,name,gender,location,website,picture,relationship_status",
                format: "json"
              }
            }).then(function (result) {
              $scope.profile.facebookProfileData = result.data;
              console.log($scope.profile.profileData);

            }, function (error) {
              alert("There was a problem getting your profile.  Check the logs for details.");
              console.log(error);
            });

            if (!($scope.profile.hasOwnProperty('fullName'))) {
              $scope.profile.fullName = $scope.profile.facebookProfileData.name;
            }

            $scope.profile.$save();
          }

          //Set Profile Defaults for first time user
          if (!($scope.profile.hasOwnProperty('weightUnit'))) {
            $scope.profile.weightUnit = 'lbs';
          }
          if (!($scope.profile.hasOwnProperty('weight'))) {
            $scope.profile.weight = 0;
          }
          if (!($scope.profile.hasOwnProperty('bodyFat'))) {
            $scope.profile.bodyFat = 0;
          }
          if (!($scope.profile.hasOwnProperty('activityLevel'))) {
            $scope.profile.activityLevel = 0;
          }
        }else{
          $scope.profile = null;
        }

      });


      $scope.activityLevelOptions = [
        { name: 'Sedentary - Desk Job', value: 0 },
        { name: 'Lightly Active - Walking somewhat', value: 1 },
        { name: 'Moderately Active - Walking constantly', value: 2 },
        { name: 'Vigorously Active - Very labor intensive', value: 3 }
      ];

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
})

.controller('SignupModalCtrl', function(LoginService, LoadingService, $ionicLoading, $scope, $ionicPopup, $state) {

    $scope.signup = function (isValid) {

      // check to make sure the form is completely valid
      if (isValid) {
        LoadingService.showLoading("Creating Account...");
        var ref = new Firebase("https://ketogains-app.firebaseio.com");

        ref.createUser({
          email: $scope.email,
          password: $scope.password
        }, function (error, userData) {
          if (error) {
            var promise = LoadingService.hideLoading();
            promise.then(function(){
              var alertPopup = $ionicPopup.alert({
                title: 'Error creating user!',
                template: error
              });
              console.log("Error creating user:", error);
            });
          } else {
            $scope.modal.hide();
            var promise = LoadingService.hideLoading('tab.profile');
            promise.then(function(){
              LoginService.loginUser($scope.email, $scope.password).success(function(data) {
                ProfileService.set("name", $scope.username);
                $state.go('tab.profile');
              })
              var alertPopup = $ionicPopup.alert({
                title: 'Ketogains App Beta v0.1a',
                template: 'Welcome to the Ketogains app beta! ' +
                'In order to calculate and optimize your macros for a ketogenic diet, ' +
                'first we need to know a little information about you and your body'
              });

              console.log("Successfully created user account with uid:", userData.uid);
            });
          }
        });

      }

    };

});
