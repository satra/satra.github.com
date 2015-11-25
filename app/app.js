// for debug only
var __kb;
var __scope;


/**
* The main app
*/
var App = angular.module('Timeline', [
  'ngAudio',
  'lumx',
  'angularMoment'
]);

App.config(function($locationProvider) {
  $locationProvider
  .html5Mode({ enabled: true, requireBase: false });
});

App.controller('Main', function($scope, $http, $location, $timeout, ngAudio, LxNotificationService, LxProgressService, LxDialogService) {
  // Namespaces
  var CHAT  = $rdf.Namespace("https://ns.rww.io/chat#");
  var CURR  = $rdf.Namespace("https://w3id.org/cc#");
  var DCT   = $rdf.Namespace("http://purl.org/dc/terms/");
  var FACE  = $rdf.Namespace("https://graph.facebook.com/schema/~/");
  var FOAF  = $rdf.Namespace("http://xmlns.com/foaf/0.1/");
  var LIKE  = $rdf.Namespace("http://ontologi.es/like#");
  var LDP   = $rdf.Namespace("http://www.w3.org/ns/ldp#");
  var MBLOG = $rdf.Namespace("http://www.w3.org/ns/mblog#");
  var OWL   = $rdf.Namespace("http://www.w3.org/2002/07/owl#");
  var PIM   = $rdf.Namespace("http://www.w3.org/ns/pim/space#");
  var RDF   = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
  var RDFS  = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
  var SIOC  = $rdf.Namespace("http://rdfs.org/sioc/ns#");
  var SOLID = $rdf.Namespace("http://www.w3.org/ns/solid/app#");
  var ST    = $rdf.Namespace("http://www.w3.org/ns/solid/terms#");
  var TMP   = $rdf.Namespace("urn:tmp:");

  var f,g;

  // INIT
  /**
  * Init app
  */
  $scope.initApp = function() {
    $scope.init();
  };

  /**
  * Set Initial variables
  */
  $scope.init = function() {

    $scope.initRDF();
    $scope.initUI();
    $scope.initQueryString();
    $scope.initLocalStorage();

    $scope.fetchAll();

    __kb = g;
    __scope = $scope;
  };


  /**
   * Init UI
   */
  $scope.initUI = function() {
    $scope.initialized = true;
    $scope.loggedIn = false;
    $scope.loginTLSButtonText = "Login";
    $scope.audio = ngAudio.load('audio/button-3.mp3');
    $scope.ponts = [];
  };


  /**
  * Get values from localStorage
  */
  $scope.initLocalStorage = function() {
    if (localStorage.getItem('user')) {
      var user = JSON.parse(localStorage.getItem('user'));
      $scope.loginSuccess(user);
    }
  };

  /**
  * init RDF knowledge base
  */
  $scope.initRDF = function() {
    var PROXY = "https://rww.io/proxy.php?uri={uri}";
    var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
    var TIMEOUT = 90000;
    $rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    g = $rdf.graph();
    f = $rdf.fetcher(g, TIMEOUT);
  };

  /**
  * init from query string
  */
  $scope.initQueryString = function() {
    if ($location.search().profile) {
      $scope.profile = $location.search().profile;
      return;
    }
    if ($location.search().timeline) {
      $scope.timeline = $location.search().timeline;
    }
  };

  /**
  * setStorageURI set the storage URI for words
  * @param  {String} the storage URI for words
  */
  $scope.setStorageURI = function(storageURI) {
    $scope.storageURI = storageURI;
    $location.search('storageURI', $scope.storageURI);
  };


  // AUTH
  /**
  * TLS Login with WebID
  */
  $scope.TLSlogin = function() {
    var AUTHENDPOINT = "https://databox.me/";
    $scope.loginTLSButtonText = 'Logging in...';
    $http({
      method: 'HEAD',
      url: AUTHENDPOINT,
      withCredentials: true
    }).success(function(data, status, headers) {
      var header = 'User';
      var scheme = 'http';
      var user = headers(header);
      if (user && user.length > 0 && user.slice(0,scheme.length) === scheme) {
        $scope.loginSuccess(user);
        $scope.fetchAll();
      } else {
        $scope.notify('WebID-TLS authentication failed.', 'error');
      }
      $scope.loginTLSButtonText = 'Login';
    }).error(function(data, status, headers) {
      $scope.notify('Could not connect to auth server: HTTP '+status);
      $scope.loginTLSButtonText = 'Login';
    });
  };

  /**
  * loginSuccess called after successful login
  * @param  {String} user the logged in user
  */
  $scope.loginSuccess = function(user) {
    //$scope.notify('Login Successful!');
    console.log(user);
    $scope.loggedIn = true;
    $scope.user = user;
    $scope.profile = user;
    localStorage.setItem('user', JSON.stringify(user));
  };

  /**
  * Logout
  */
  $scope.logout = function() {
    $scope.init();
    $scope.notify('Logout Successful!');
    localStorage.removeItem('user');
  };

  // FETCH functions
  //
  //
  $scope.fetchAll = function() {
    $scope.fetchWebid($scope.profile);
  };

  /**
   * Fetch the webid
   * @param  {String} position The URI for the position
   */
  $scope.fetchWebid = function (webid) {
    var uri = webid || $scope.user;

    if (!uri) return;
    console.log(uri);

    f.requestURI(uri.split('#')[0], undefined, true, function(ok, body) {
      var name = g.statementsMatching($rdf.sym(uri), FOAF('name'));
      if (name.length) {
        $scope.name = name[0].object.value;
        $scope.render();
      }
      var friends = g.statementsMatching(undefined, FOAF('knows'));
      $scope.friends = friends.length;

      var timeline = g.any($rdf.sym(uri), ST('timeline'));

      if (timeline) {
        $scope.timeline = timeline.uri;
      }

      $scope.fetchTimeline();

    });
  };

  /**
   * Invalidate a cached URI
   * @param  {String} uri The URI to invalidate
   */
  $scope.invalidate = function(uri) {
    console.log('invalidate : ' + uri);
    f.unload(uri);
    f.refresh($rdf.sym(uri));
  };


  /**
  * fetchTimeline fetches the see also
  */
  $scope.fetchTimeline = function() {
    var timeline = $scope.timeline;
    if ($location.search().timeline) {
      timeline = $location.search().timeline;
    }
    $scope.timeline = timeline;
    if ($scope.profile) {
      $location.search('profile', $scope.profile);
    }

    var today = new Date().toISOString().substr(0,10);
    var uri = timeline + today + '/*';
    f.nowOrWhenFetched(uri, undefined, function(ok, body) {
      console.log('timeline fetched from : ' + uri);
      $scope.render();
    });

  };

  /**
   * Save the position
   */
  $scope.save = function() {
    var position = $scope.position;
    if (!position) {
      LxNotificationService.error('position is empty');
      return;
    }
    console.log(position);

    $http({
      method: 'PUT',
      url: $scope.storageURI,
      withCredentials: true,
      headers: {
        "Content-Type": "text/turtle"
      },
      data: '<#this> '+ TMP('fen') +' """' + position + '""" .',
    }).
    success(function(data, status, headers) {
      LxNotificationService.success('Position saved');
      $location.search('storageURI', $scope.storageURI);
      $scope.renderBoard(position);
    }).
    error(function(data, status, headers) {
      LxNotificationService.error('could not save position');
    });

  };


  // HELPER
  /**
  * Notify
  * @param  {String} message the message to display
  * @param  {String} type the type of notification, error or success
  */
  $scope.notify = function(message, type) {
    console.log(message);
    if (type === 'error') {
      LxNotificationService.error(message);
    } else {
      LxNotificationService.success(message);
    }
  };



  // RENDER
  /**
  * Render screen
  */
  $scope.render = function() {
    $scope.renderStats();
    $scope.renderTimeline();
  };

  /**
   * Render the stats
   */
  $scope.renderStats = function () {
    if ($scope.stats) {
      $scope.points = $scope.stats.split('-');
    }
  };

  /**
   * Render the timeline
   */
  $scope.renderTimeline = function () {
    var p = g.statementsMatching(null, null, SIOC('Post'));
    $scope.posts = [];
    for (var i=0; i<p.length;i++) {
      var subject = p[i].subject;
      var created = g.any(subject, DCT('created'));
      var creator = g.any(subject, DCT('creator'));
      var content = g.any(subject, SIOC('content'));
      var author  = g.any(subject, MBLOG('author'));
      var img  = g.any(subject, FOAF('img'));

      if (img) {
        img = img.uri;
      }

      $scope.posts.push([created.value, creator.uri, content.value, subject.uri, img]);


    }

    $scope.posts = $scope.posts.sort(function(a, b) {
      createda = a[0];
      createdb = b[0];
      //if ( !createda || !createdb ) return;
      a = new Date(createda);
      b = new Date(createdb);
      return a>b ? -1 : a<b ? 1 : 0;
    });

  };

  /**
   * Refresh the board
   */
  $scope.refresh = function() {
    $scope.fetchBoard();
    $scope.render();
  };

  /**
  * openDialog opens a dialog box
  * @param  {String} elem  The element to display
  */
  $scope.openDialog = function(elem) {
    LxDialogService.open(elem);
    $(document).keyup(function(e) {
      if (e.keyCode===27) {
        LxDialogService.close(elem);
      }
    });
  };


  // SOCKETS
  //
  //
  /**
   * Get wss from URI
   * @param  {String} uri The URI to use
   */
  function getWss(uri) {
    return 'wss://' + uri.split('/')[2];
  }

  /**
   * Connect to a web socket
   * @param  {String}  sub Where to subscribe to
   * @param  {boolean} quiet dont ping server
   */
  function connectToSocket(sub, quiet) {
    // Some servers time out after 5 minutes inactive
    var INTERVAL  = 240 * 1000;
    var RECONNECT = 60 * 1000;

    if ($scope.socket) return;

    var socket;

    var wss = getWss(sub);
    console.log('connecting to : ' + wss);

    socket = new WebSocket(wss);

    socket.onopen = function(){
      console.log(sub);
      $scope.socket = socket;
      socket.send('sub ' + sub, socket);

      if (!quiet) {
        setInterval(function() { socket.send('ping'); }, INTERVAL);
      }

    };

    socket.onerror = function(){
      console.log('socket error');
      setTimeout(connect, RECONNECT);
    };

    socket.onclose = function(){
      console.log('socket closed');
      setTimeout(connect, RECONNECT);
    };

    socket.onmessage = function(msg) {
      var a = msg.data.split(' ');
      if (a[0] !== 'pub') return;
      processSocket(a[1]);
    };

  }

  /**
   * Process message from socket
   * @param  {String} uri uri that has changed
   */
  function processSocket(uri) {
    console.log(uri);

    $scope.invalidate(uri);
    $scope.fetchAll();
    $scope.audio.play();

    Notification.requestPermission(function (permission) {
      // If the user is okay, let's create a notification
      if (permission === "granted") {
        notify = true;
      }
    });
  }



  $scope.initApp();

});

/**
 * Escape URIs filter
 */
App.filter('escape', function() {
  return window.encodeURIComponent;
});
