angular.module('ketogains.services', [])

.factory('Auth', function($firebaseAuth) {
  var endPoint = "https://ketogains-app.firebaseio.com" ;
  var usersRef = new Firebase(endPoint);
  return $firebaseAuth(usersRef);
})

.service('UserService', function() {
  var userToken;

  this.setUserToken = function(token){
    this.userToken = token;
    console.log("User token was saved with: " + token);
  }

  this.getUserToken = function(){
    return this.userToken;
    console.log("User Data was retrieved: " + this.userToken);
  };
})

.service('Bodyfat', function() {
  var bodyfat;

  this.setBodyfat = function(bf){
    this.bodyfat = bf;
  }

  this.getBodyfat = function(){
    return this.bodyfat;
  };
})

.service('LoginService', function($q) {
  return {
    loginUser: function(name, pw) {
      var deferred = $q.defer();
      var promise = deferred.promise;

      if (name == 'user' && pw == 'secret') {
        deferred.resolve('Welcome ' + name + '!');
      } else {
        deferred.reject('Wrong credentials.');
      }
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
});
