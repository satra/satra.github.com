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

App.controller('Main', function($scope, $filter, $http, $location, $timeout, ngAudio, LxNotificationService, LxProgressService, LxDialogService) {
  // Namespaces
  var CERT  = $rdf.Namespace("http://www.w3.org/ns/auth/cert#");
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

    $scope.queue = [];
    $scope.knows = [];
    $scope.preferences = [];
    $scope.storage = [];
    $scope.fetched = {};
    $scope.seeAlso = [];
    $scope.wallet = [];
    $scope.timelines = [];
    $scope.workspaces = [];
    $scope.configurations = [];
    $scope.configurationFiles = [];
    $scope.apps = [];
    $scope.my = {};
    $scope.friends = [];
    $scope.keys = [];
    $scope.cal = null;


    $scope.initRDF();
    $scope.initDexie();
    $scope.initUI();
    $scope.initQueryString();
    $scope.initLocalStorage();

    fetchAll();

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
    $scope.posts = [];
    $scope.date = new Date().toISOString().substr(0,10);
    $scope.initCalendar();
    $scope.f = "#nutrition";

  };

  /**
  * Init Calendar
  */
  $scope.initCalendar = function() {
    $scope.cal = new CalHeatMap();
    $scope.cal.init({
      itemSelector: "#calendar",
      domain: "month",
      subDomain: "x_day",
      data: [],
      start: new Date(2015, 11, 2),
      cellSize: 15,
      cellRadius: 3,
      cellPadding: 5,
      range: 1,
      domainMargin: 20,
      animationDuration: 800,
      domainDynamicDimension: false,
      previousSelector: "#PreviousMonth-selector",
      nextSelector: "#NextMonth-selector",
      tooltip: true,
      onClick: function(date, nb) {

        var yyyy = date.getFullYear().toString();
        var mm = (date.getMonth()+1).toString(); // getMonth() is zero-based
        var dd  = date.getDate().toString();
        var d = yyyy + '-' + (mm[1]?mm:"0"+mm[0]) + '-' + (dd[1]?dd:"0"+dd[0]); // padding

        $scope.notify( d );
        $location.search('date', d);
        $scope.date = d;
        $scope.render();
      },
      label: {
        position: "botton",
        offset: {
          x: 40,
          y: 125
        },
        width: 110
      },
      legend: [5, 10,15, 20]
    });
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
    //var PROXY = "https://rww.io/proxy.php?uri={uri}";
    //var AUTH_PROXY = "https://rww.io/auth-proxy?uri=";
    var TIMEOUT = 90000;
    //$rdf.Fetcher.crossSiteProxyTemplate=PROXY;

    g = $rdf.graph();
    f = $rdf.fetcher(g, TIMEOUT);
  };

  /**
  * init Dexie knowledge base
  */
  $scope.initDexie = function() {
    // start browser cache DB
    db = new Dexie("chrome:theSession");
    db.version(1).stores({
      cache: 'why,quads',
    });
    db.open();
  };


  /**
  * init from query string
  */
  $scope.initQueryString = function() {
    if ($location.search().date) {
      $scope.date = $location.search().date;
    }
    if ($location.search().q) {
      $scope.q = $location.search().q;
    }
    if ($location.search().f) {
      $scope.f = $location.search().f;
    }
    $location.search('date', $scope.date);
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
        fetchAll();
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
    $scope.notify('Login Successful!');
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
    $scope.user = null;
    localStorage.removeItem('user');
    $scope.notify('Logout Successful!');
    localStorage.removeItem('user');
  };


  // QUEUE functions
  //
  //
  /**
   * Update the queue
   */
  function updateQueue() {
    var i, j;
    console.log('updating queue');
    if ($scope.user) {
      addToQueue($scope.queue, $scope.user);
    }

    if ($scope.profile) {
      addToQueue($scope.queue, $scope.profile);
    }

    workspaces = g.statementsMatching($rdf.sym($scope.user), PIM('storage'), undefined);
    for (i=0; i<workspaces.length; i++) {
      addToArray($scope.storage, workspaces[i].object.uri);
      addToQueue($scope.queue, workspaces[i].object.uri);
    }


    var knows = g.statementsMatching($rdf.sym($scope.user), FOAF('knows'), undefined);
    for (i=0; i<knows.length; i++) {
      //console.log(knows[i].object.uri);
      addToArray($scope.knows, knows[i].object.uri);
      addToQueue($scope.queue, knows[i].object.uri);
      workspaces = g.statementsMatching($rdf.sym(knows[i].object.uri), PIM('storage'), undefined);
      for (j=0; j<workspaces.length; j++) {
        addToArray($scope.storage, workspaces[j].object.uri);
        addToQueue($scope.queue, workspaces[j].object.uri);
      }
    }


    workspaces = g.statementsMatching(undefined, PIM('workspace'), undefined);
    for (i=0; i<workspaces.length; i++) {
      addToArray($scope.workspaces, workspaces[i].object.uri);
      addToArray($scope.workspaces, workspaces[i].object.uri + '*');
      addToQueue($scope.queue, workspaces[i].object.uri);
      addToQueue($scope.queue, workspaces[i].object.uri + '*');
    }

    var preferences = g.statementsMatching($rdf.sym($scope.user), PIM('preferencesFile'), undefined);
    for (i=0; i<preferences.length; i++) {
      addToArray($scope.preferences, preferences[i].object.uri);
      addToQueue($scope.queue, preferences[i].object.uri);
    }

    var configurationFiles = g.statementsMatching(null, RDF('type'), PIM('ConfigurationFile'));
    for (i=0; i<configurationFiles.length; i++) {
      addToArray($scope.configurationFiles, configurationFiles[i].subject.value );
      addToQueue($scope.queue, configurationFiles[i].subject.value);
      var configurations = g.statementsMatching($rdf.sym(configurationFiles[i].subject.value), SOLID('configuration'), undefined);
      for (j=0; j<configurations.length; j++) {
        addToArray($scope.configurations, configurations[j].object.uri );
        addToQueue($scope.queue, configurations[j].object.uri);
      }
    }



    var wallets = g.statementsMatching($rdf.sym($scope.user), CURR('wallet'), undefined);
    for (i=0; i<wallets.length; i++) {
      addToArray($scope.wallet, wallets[i].object.uri);
      addToQueue($scope.queue, wallets[i].object.uri);
    }

    var keys = g.statementsMatching($rdf.sym($scope.user), CERT('key'), undefined);
    for (i=0; i<keys.length; i++) {
      addToArray($scope.keys, keys[i].object.uri);
      addToQueue($scope.queue, keys[i].object.uri);
    }

    var timelines = g.statementsMatching(null, ST('timeline'), undefined);
    for (i=0; i<timelines.length; i++) {
      addToArray($scope.timelines, timelines[i].object.uri);
      addToArray($scope.timelines, timelines[i].object.uri + '*');
      addToQueue($scope.queue, timelines[i].object.uri);
      addToQueue($scope.queue, timelines[i].object.uri + '*');

      var dates = g.statementsMatching($rdf.sym(timelines[i].object.uri), LDP('contains'), undefined);
      for (j=0; j<dates.length; j++) {
        addToQueue($scope.queue, dates[j].object.uri + '*');
      }

    }



    var seeAlso = g.statementsMatching($rdf.sym($scope.user), RDFS('seeAlso'), undefined);
    for (i=0; i<seeAlso.length; i++) {
      //console.log('seeAlso found : ' + seeAlso[i].object.uri);
      addToArray($scope.seeAlso, seeAlso[i].object.uri);
      addToQueue($scope.queue, seeAlso[i].object.uri);
    }

  }


  function cache(uri) {
    console.log('caching ' + uri);
    var why = uri.split('#')[0];
    var quads = g.statementsMatching(undefined, undefined, undefined, $rdf.sym(why));

    db.cache.put({"why": why, "quads": quads}). then(function(){
      console.log('cached : ' + quads);
    }).catch(function(error) {
      console.error(error);
    });


  }


  // FETCH functions
  //
  //
  /**
   * Fetch all items in queue
   */
  function fetchAll() {

    updateQueue();

    //if ($scope.queue.length === 0) return;

    for (var i=0; i<$scope.queue.length; i++) {
      if($scope.queue[i]) {
        if (!$scope.fetched[$scope.queue[i]]) {
          $scope.fetched[$scope.queue[i]] = new Date();
          fetch($scope.queue[i]);
        }
      } else {
        console.error('queue item ' + i + ' is undefined');
        console.log($scope.queue);
      }
    }

  }

  /**
   * Fetch a single URI
   * @param  {String} uri The URI to fetch
   */
  function fetch(uri) {
    $scope.fetched[uri] = new Date();
    console.log('fetching : ' + uri);

    var why = uri.split('#')[0];

    db.cache.get(why).then(function(res){
      if (res && res.quads && res.quads.length) {
        console.log('uncached : ');
        console.log('fetched '+ uri +' from cache in : ' + (new Date() - $scope.fetched[uri]) );
        console.log(res);
        for(var i=0; i<res.quads.length; i++) {
          var t = res.quads[i].object.uri;
          if (t) {
            t = $rdf.sym(res.quads[i].object.uri);
          } else {
            t = $rdf.term(res.quads[i].object.value);
          }
          //console.log(g.any( $rdf.sym(res.quads[i].subject.value), $rdf.sym(res.quads[i].predicate.value), t, $rdf.sym(res.quads[i].why.value) ));
          if (!g.any( $rdf.sym(res.quads[i].subject.uri), $rdf.sym(res.quads[i].predicate.uri), t, $rdf.sym(res.quads[i].why.uri) )) {
            g.add( $rdf.sym(res.quads[i].subject.uri), $rdf.sym(res.quads[i].predicate.uri), t, $rdf.sym(res.quads[i].why.uri) );
          }

        }
        f.requested[why] = 'requested';
        console.log('fetched '+ uri +' from cache in : ' + (new Date() - $scope.fetched[uri]) );
        $scope.render();
        fetchAll();
      } else {
        var quads = g.statementsMatching(undefined, undefined, undefined, $rdf.sym(why));
        f.nowOrWhenFetched(why, undefined, function(ok, body) {
          cache(uri);
          console.log('fetched '+ uri +' from rdflib in : ' + (new Date() - $scope.fetched[uri]) );
          console.log('status '+ uri +' '+ ok +' : ' + body);
          $scope.render();
          fetchAll();
        });
      }
    }).catch(function(error) {
      console.error(error);
    });

  }


  /**
   * Invalidate a cached URI
   * @param  {String}   uri The URI to invalidate
   * @param  {Function} callback The callback
   */
  $scope.invalidate = function(uri, callback) {
    console.log('invalidate : ' + uri);
    uri = uri.split('#')[0];
    f.unload(uri);
    f.refresh($rdf.sym(uri));
    $scope.fetched[uri] = undefined;
    db.cache.delete(uri).then(function() {
      callback();
    });
  };


  /**
  * Save the post
  */
  $scope.save = function() {

    var post = $scope.post;

    if (!post && !$scope.img) {
      $scope.notify('Post is empty', 'error');
      return;
    }
    if ($scope.profile !== $scope.user) {
      $scope.notify('Can only post to your own timeline', 'error');
      return;
    }
    if (!$scope.timeline) {
      $scope.notify('Please add timeline to your WebID', 'error');
      return;
    }
    console.log(post);
    var message = $scope.createPost($scope.user, post, null, $scope.img);
    var today = new Date().toISOString().substr(0,10);
    var uri = $scope.timeline + today + '/';
    console.log(uri);
    console.log(message);

    $http({
      method: 'POST',
      url: uri,
      withCredentials: true,
      headers: {
        "Content-Type": "text/turtle"
      },
      data: message,
    }).
    success(function(data, status, headers) {
      $scope.notify('Post saved');
      $scope.post = null;
      $scope.img = null;
      $scope.refresh();
    }).
    error(function(data, status, headers) {
      $scope.notify('could not save post', 'error');
    });

  };


  /**
  * create a post in turtle
  * @param  {string} webid       the creator
  * @param  {string} message     the message to send
  * @param  {string} application application that created it
  * @param  {string} img         img for that post
  * @return {string}             the message in turtle
  */
  $scope.createPost = function(webid, message, application, img) {
    var turtle;
    turtle = '<#this> ';
    turtle += '    <http://purl.org/dc/terms/created> "'+ new Date().toISOString() +'"^^<http://www.w3.org/2001/XMLSchema#dateTime> ;\n';
    turtle += '    <http://purl.org/dc/terms/creator> <' + webid + '> ;\n';
    turtle += '    <http://rdfs.org/sioc/ns#content> """'+ message.trim() +'""" ;\n';
    turtle += '    a <http://rdfs.org/sioc/ns#Post> ;\n';

    if (application) {
      turtle += '    <https://w3.org/ns/solid/app#application> <' + application + '> ;\n';
    }

    if (img) {
      turtle += '    <http://xmlns.com/foaf/0.1/img> <' + img + '> ;\n';
    }

    turtle += '    <http://www.w3.org/ns/mblog#author> <'+ webid +'> .\n';
    return turtle;
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
      notie.alert(3, message, 1);
    } else {
      notie.alert(1, message, 1);
    }
  };


  // HELPER functions
  //
  //
  /**
   * Add an element to an array once
   * @param {Array} array the array to add to
   * @param {Object} el   the element to add
   */
  function addToArray(array, el) {
    if (!array) return;
    if (array.indexOf(el) === -1) {
      array.push(el);
    }
  }

  /**
   * Add an element to the firends array once
   * @param {Array} array the array to add to
   * @param {Object} el   the element to add
   */
  function addToFriends(array, el) {
		if (!array) return;
		for (var i=0; i<array.length; i++) {
			if (array[i].id === el.id) {
				return;
			}
		}
		array.push(el);
	}

  /**
   * Add an element to the apps array once
   * @param {Array} array the array to add to
   * @param {Object} el   the element to add
   */
  function addToApps(array, el) {
		if (!array) return;
		for (var i=0; i<array.length; i++) {
			if (array[i].id === el.id) {
        array[i] = el;
				return;
			}
		}
		array.push(el);
	}


  /**
   * Add an element to the queue
   * @param {Array} array the array to add to
   * @param {Object} el   the element to add
   */
  function addToQueue(array, el) {
    if (!array) return;
    if (!el) return;
    if (array.indexOf(el) === -1) {
      array.push(el);
    }
  }


  // RENDER
  /**
  * Render screen
  */
  $scope.render = function() {
    $scope.renderWebid();
    $scope.renderTimeline();
  };

  /**
  * Render the webid
  * @param  {String} position The URI for the position
  */
  $scope.renderWebid = function (webid) {
    var uri = webid || $scope.user || $scope.profile;
    $location.search('profile', uri);

    if (!uri) return;
    console.log(uri);

    f.nowOrWhenFetched(uri.split('#')[0], undefined, function(ok, body) {
      var name = g.statementsMatching($rdf.sym(uri), FOAF('name'));
      if (name.length) {
        $scope.name = name[0].object.value;
      }
      var friends = g.statementsMatching($rdf.sym($scope.profile), FOAF('knows'));
      $scope.friends = friends.length;

      var timeline = g.any($rdf.sym(uri), ST('timeline'));

      if (timeline) {
        $scope.timeline = timeline.uri;
      }

    });
  };

  /**
  * Render the timeline
  */
  $scope.renderTimeline = function () {
    var p = g.statementsMatching(null, null, SIOC('Post'));
    $scope.initQueryString();
    $scope.posts = [];
    $scope.data = {};
    for (var i=0; i<p.length;i++) {
      var subject = p[i].subject;
      var created = g.any(subject, DCT('created'));
      var creator = g.any(subject, DCT('creator'));
      var content = g.any(subject, SIOC('content'));
      var author  = g.any(subject, MBLOG('author'));
      var img  = g.any(subject, FOAF('img'));

      var stamp = Math.round(new Date(created).getTime() / 1000);
      $scope.data[stamp] = 1;

      if ($scope.q && content && content.value && content.value.indexOf($scope.q) === -1) {
        continue;
      }

      if ($scope.f && content && content.value && content.value.indexOf($scope.f) !== -1) {
        continue;
      }

      if (img) {
        img = img.uri;
      }

      if (content && content.value) {
        message = content.value;
      } else {
        message = null;
      }

      if ( created.value.substring(0,10) === $scope.date || $scope.date === 'all' ) {
        $scope.posts.push([created.value, creator.uri, message, subject.uri, img]);
      }

    }

    $scope.cal.update($scope.data);

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
  * Refresh
  */
  $scope.refresh = function() {
    $scope.notify('Refreshing!');
    $scope.invalidate($scope.timeline + $scope.date + '/*', function() {
      fetch($scope.timeline + $scope.date + '/*');
    });
    $scope.invalidate($scope.timeline, function() {
      fetch($scope.timeline);
    });
  };

  /**
  * Search box
  */
  $scope.search = function() {
    $scope.q = $scope.query;
    $location.search('q', $scope.q);
    $scope.render();
  };

  /**
  * Home
  */
  $scope.home = function() {
    $scope.q = null;
    $scope.query = null;
    $scope.date = new Date().toISOString().substring(0,10);
    $location.search('date', $scope.date);
    $location.search('q', null);
    $scope.render();
  };

  /**
  * Featured
  */
  $scope.featured = function() {
    $scope.f = "#nutrition";
    $scope.render();
  };

  /**
  * Stories
  */
  $scope.stories = function() {
    $scope.f = null;
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

  /**
  * older sets date one day back
  */
  $scope.older = function() {
    date = new Date($scope.date);
    var yesterday = new Date();
    yesterday.setDate(date.getDate() - 1);
    $scope.date = yesterday.toISOString().substring(0,10);
    fetchAll();
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
    fetchAll();
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

App.filter('parseUrlFilter', ['$sce', function ($sce) {
    var urlPattern = /(http|ftp|https):\/\/[\w-]+(\.[\w-]+)+([\w.,@?^=%&amp;:\/~+#-]*[\w@?^=%&amp;\/~+#-])?/gi;
    return function (text) {
        var target = '_blank';
        return $sce.trustAsHtml(text.replace(urlPattern, '<a target="' + target + '" href="$&">$&</a>'));
    };
}]);
