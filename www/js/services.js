angular.module('ketogains.services', [])

// constant for the Firebase we're using
.constant('FBURL', 'https://ketogains-app.firebaseio.com')

// return the Firebase ref as a service
.service('Ref', ['FBURL', Firebase])

// return the Todos from Firebase by returning the
// array from the factory
.factory('Progress', function(Ref, $firebase) {

  var service = {
    get: get,
    all: all
  };

  return service;

  function get(id) {
    return $firebase(Ref.child(id)).$asObject();
  }

  function all() {
    return $firebase(Ref).$asArray();
  }
})

.factory('Macros', function(Ref, $firebase) {

  var service = {
    get: get,
    all: all
  };

  return service;

  function get(id) {
    return $firebase(Ref.child(id)).$asObject();
  }

  function all() {
    return $firebase(Ref).$asArray();
  }
})

.factory('Auth', function($firebaseAuth) {
  var endPoint = "https://ketogains-app.firebaseio.com" ;
  var usersRef = new Firebase(endPoint);
  return $firebaseAuth(usersRef);
})

.factory('AuthSvc',function() {
  return {
    user: {loggedIn:false},
    logout : function() {
      // do whatever other logout stuff you need, like deleting sessions
      this.user.loggedIn = false;
    },
    login : function() {
      // do whatever other login stuff you need, like validating with the server
      this.user.loggedIn = true;
    }
  };
})

// a factory to create a re-usable Profile object
// we pass in a UID and get back their synchronized data as an object
.factory('getFirebaseObject', ['$firebaseObject',
  function($firebaseObject) {
    return function(uid, data) {
      // create a reference to the database where we will store our data
      var ref = new Firebase("https://ketogains-app.firebaseio.com/users/");
      var dataRef = ref.child(uid).child(data);

      // return it as a synchronized object
      return $firebaseObject(dataRef);
    }
  }
])

.service('LoginService', function(Auth, $q) {
  return {
    loginUser: function(email, password) {
      var deferred = $q.defer();
      var promise = deferred.promise;

      Auth.$authWithPassword({
        email    : email,
        password : password
      }, function(error, authData) {
        if (error) {
          deferred.reject('Wrong credentials.');
          console.log("Login Failed!", error);
        } else {
          deferred.resolve('Welcome ' + name + '!');
          console.log("Authenticated successfully with payload:", authData);
        }
      });

      promise.success = function(fn) {
        promise.then(fn);
        return promise;
      }
      promise.error = function(fn) {
        promise.then(null, fn);
        return promise;
      }
      return promise;
    }
  }
})

.service('LoadingService', function($state, $ionicLoading, $q) {
  return {
    showLoading: function(template) {
      $ionicLoading.show({
        template: template
      }).then(function(){
        console.log("The loading indicator is now displayed");
      });
    },
    hideLoading: function(state) {
      return $q(function(resolve) {
        setTimeout(function() {
          resolve($ionicLoading.hide().then(function(){
            if(state){
              $state.go(state);
            }
            console.log("The loading indicator is now hidden");
          }));
        }, 2000);
      })
    }
  }
});
