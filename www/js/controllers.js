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
        LoadingService.hideLoading();
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
            mc.macros.$save();
            recalculateMacros();
            updateCalories();
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
              $state.go('tab.profile');
            }

          })
        }
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
        } else if ( mc.macros.goal == 'GAIN') {
          mc.macros.surplus = 10;
          mc.macros.deficit = 0;
        }

        mc.refreshMacros();
      }

      function updateCalories(){
        if((mc.profile != undefined) && (mc.macros != undefined)){
          if (mc.macros.deficit > 0) {
            mc.macros.totalCalories = parseFloat((mc.profile.tdee * ((100 - parseInt(mc.macros.deficit)) / 100)).toFixed(0));
          } else if (mc.macros.surplus > 0) {
            mc.macros.totalCalories = parseFloat((mc.profile.tdee * ((100 + parseInt(mc.macros.surplus)) / 100)).toFixed(0));
          } else {
            mc.macros.totalCalories = mc.profile.tdee;
          }
          mc.save();
        }
      }

      function updateMacros(){
        var proteinCals;
        var carbCals;
        var fatCals;

        if((mc.profile != undefined) && (mc.macros != undefined)){
          mc.macros.proteinGrams = parseFloat((mc.profile.leanMassLbs * (mc.macros.proteinRatio / 100)).toFixed(0));
          proteinCals = parseFloat((mc.macros.proteinGrams * 4).toFixed(0));

          mc.macros.carbGrams = 25;
          carbCals = parseFloat((mc.macros.carbGrams * 4).toFixed(0));

          fatCals = parseFloat(mc.macros.totalCalories - (proteinCals + carbCals));
          mc.macros.fatGrams = parseFloat((fatCals / 9).toFixed(0));

          console.log(mc.macros.proteinGrams, "Protein Grams");
          console.log(mc.macros.carbGrams, "Carb Grams");
          console.log(mc.macros.fatGrams, "Fat Grams");


        }
      }

      mc.save = function(){
        mc.macros.$save();
        mc.profile.$save();
      }

      mc.changeProtocol = function () {
        mc.save();
        recalculateMacros();
        updateCalories();
        $ionicSlideBoxDelegate.update();
      }

      mc.refreshMacros = function() {
        recalculateMacros();
        updateCalories();
        $scope.$broadcast('scroll.refreshComplete');
      }

      function recalculateMacros() {

        if (mc.macros != undefined) {
          updateCalories();
          updateMacros();

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
            data: [mc.macros.proteinGrams, mc.macros.fatGrams, mc.macros.carbGrams],
            options: {
              responsive: false,
              chartColors: ['#cbffd3', '#eef94c', '#f25656'],
              legend: {
                display: true,
              },
              animation: false,
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
            chartColors: ['#cbffd3', '#eef94c', '#f25656'],
            options: {
              responsive: false,
              legend: {
                display: true,
              },
              animation: false,
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
      }

})

.controller('ProfileCtrl', function($rootScope, $http, $firebaseObject, getFirebaseObject, $scope, $ionicModal, Auth) {

      $scope.$on("$ionicView.beforeEnter", function(event, data) {
        //attach current profile info to scope
        $scope.authData = Auth.$getAuth();

        if ($scope.authData === null) {
          $scope.profile = null;
        }else{
          var profile = getFirebaseObject($scope.authData.uid, 'profile');
          profile.$loaded().then(function () {
            console.log("PROFILE", profile);
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
                $scope.profile.picture = $scope.profile.facebookProfileData.picture.data.url;
                $scope.profile.$save();
                console.log("facebookProfileData", $scope.profile.facebookProfileData);

                if (!($scope.profile.hasOwnProperty('fullName'))) {
                  $scope.profile.fullName = $scope.profile.facebookProfileData.name;
                }

              }, function (error) {
                alert("There was a problem getting your profile.  Check the logs for details.");
                console.log(error);
              });
            }

            if ($scope.profile.hasOwnProperty('fullName')) {
              var nameArray = $scope.profile.fullName.split(" ");
              $scope.firstName = nameArray[0];
            } else {
              $scope.firstName = "Ketogainer";
            }

            if (!($scope.profile.hasOwnProperty('picture'))) {
              $scope.profile.picture = "img/default.png";
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
              $scope.profile.activityLevel = 1;
            }
            $scope.profile.$save();

          });
        }
      });

      $scope.$on("$ionicView.beforeLeave", function(event, data){
        $scope.bodyCompChange();
      });




      $scope.activityLevelOptions = [
        { name: 'Sedentary - Desk Job', value: 1 },
        { name: 'Lightly Active - Walking somewhat', value: 1.12 },
        { name: 'Moderately Active - Walking constantly', value: 1.26 },
        { name: 'Vigorously Active - Very labor intensive', value: 1.47 }
      ];

      $scope.openModal = function() {
        $scope.bodyFatCtrl.show();
      };

      $scope.closeModal = function() {
        $scope.bodyFatCtrl.hide();
      };

      $scope.save = function() {
        $scope.profile.$save();
      }

      $scope.changeWeightUnit = function(){
        if($scope.profile.weightUnit == 'kg'){
          $scope.profile.weight = parseFloat(($scope.profile.weight / 2.2046224).toFixed(2));
        }else if($scope.profile.weightUnit == 'lbs'){
          $scope.profile.weight = parseFloat(($scope.profile.weight * 2.2046224).toFixed(2));
        }
        $scope.profile.$save();
        $scope.bodyCompChange();
      }

      $scope.bodyCompChange = function(){
        updateBodyComposition();
        updateRecommendations();
      }

      $ionicModal.fromTemplateUrl('templates/bodyfat-estimate.html', function(modal) {
        $scope.bodyFatCtrl = modal;
      }, {
        scope: $scope,
        animation: 'slide-in-up',
      });

      // Set recommended calorie deficit
      updateRecommendations = function() {

        if ($scope.profile.bodyFat >= 30) {
          $scope.profile.recommendedDeficit = 25;
          $scope.profile.recommendedSurplus = 0;
        } else if ($scope.profile.bodyFat >= 20) {
          $scope.profile.recommendedDeficit = 20;
          $scope.profile.recommendedSurplus = 2;
        } else if ($scope.profile.bodyFat >= 15) {
          $scope.profile.recommendedDeficit = 15;
          $scope.profile.recommendedSurplus = 5;
        }else{
          $scope.profile.recommendedDeficit = 10;
          $scope.profile.recommendedSurplus = 10;
        }

        $scope.save();
      }

      // Update the user's body comp, calculating Lean Mass, BMR, TDEE, TEF
      function updateBodyComposition() {

        //Calculate
        var weightKg;
        var leanKg;
        var weightLbs;
        var leanLbs;

        if ($scope.profile.weight > 0) {
          if ($scope.profile.weightUnit == 'lbs') {
            weightKg = parseFloat(($scope.profile.weight / 2.2046224).toFixed(2));
            leanKg = parseFloat((weightKg * (100 - $scope.profile.bodyFat) / 100).toFixed(2));

            //Calculate BMR, TEF, TDEE
            $scope.profile.leanMassKg = leanKg;
            $scope.profile.leanMass = parseFloat(($scope.profile.weight * ((100 - $scope.profile.bodyFat) / 100)).toFixed(2));
            $scope.profile.leanMassLbs = $scope.profile.leanMass;
            $scope.profile.bmr = parseFloat((370 + (21.6 * leanKg)).toFixed(0));
            $scope.profile.tef = parseFloat(($scope.profile.bmr * 0.1).toFixed(0));
            $scope.profile.tdee = parseFloat((($scope.profile.bmr + $scope.profile.tef) * ($scope.profile.activityLevel)).toFixed(0));
            $scope.profile.minCalorieNeed = parseFloat((weightKg * 0.1).toFixed(2));
          } else {
            weightLbs = parseFloat(($scope.profile.weight * 2.2046224).toFixed(2));
            leanLbs = parseFloat((weightLbs * (100 - $scope.profile.bodyFat) / 100).toFixed(2));

            $scope.profile.leanMassLbs = leanLbs;
            $scope.profile.leanMass = parseFloat(($scope.profile.weight * ((100 - $scope.profile.bodyFat) / 100)).toFixed(2));
            $scope.profile.bmr = parseFloat((370 + (21.6 * $scope.profile.leanMass)).toFixed(0));
            $scope.profile.tef = parseFloat(($scope.profile.bmr * 0.1).toFixed(0));
            $scope.profile.tdee = parseFloat((($scope.profile.bmr + $scope.profile.tef) * ($scope.profile.activityLevel)).toFixed(0));
            $scope.profile.minCalorieNeed = parseFloat(($scope.profile.weight * 0.1).toFixed(2));
        }
      }

        $scope.save();
      }

})

.controller('BodyFatModalCtrl', function($scope) {
  $scope.hideModal = function() {
    $scope.profile.$save();
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
