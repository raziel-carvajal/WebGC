(function(exports){
  
  function Bootstrap(coordi){
    if(!(this instanceof Bootstrap)){ return new Bootstrap(coordi); }
    this.coordi = coordi;
    this.url = 'http://' + coordi.host + ':' + coordi.port + '/';
  }
  
  Bootstrap.prototype.bootstrap = function(){
    this.coordi.log.info('Getting first peer');
    this.getNeighbour();
    this.coordi.log.info('Posting profile');
    this.postProfile();
    this.coordi.log.info('Getting first view after: ' +
      this.coordi.bootstrapTimeout + ' ms');
    var self = this;
    window.setTimeout(function(){
      self.coordi.log('Getting first view now');
      self.getFirstView();
    }, this.coordi.bootstrapTimeout);
  };
  
  Bootstrap.prototype.postProfile = function(){
    var xhr = new XMLHttpRequest();
    var self = this;
    xhr.open('POST', this.url + 'profile', true);
    xhr.setRequestHeader('Content-type', 'text/plain');
    xhr.onreadystatechange = function(){
      if (xhr.readyState !== 4){ return; }
      if (xhr.status !== 200) { xhr.onerror(); return; }
      self.coordi.log.info('profile was posted properly');
    };
    xhr.onerror = function(){
      self.coordi.log.error('while posting profile on server');
    };
    var msg = {id: this.coordi.id, profile: this.coordi.profile};
    xhr.send(JSON.stringify(msg));
  };
  
  Bootstrap.prototype.getFirstView = function() {
    var http = new XMLHttpRequest();
    http.open('get', this.url + this.coordi.options.key +
      '/' + this.coordi.id + '/view', true);
    var self = this;
    http.onerror = function(e) {
      self.coordi.log.error('Error retrieving the view of IDs');
      self.coordi._abort('server-error', 'Could not get the random view');
    };
    
    http.onreadystatechange = function() {
      if (http.readyState !== 4){ return; }
      if (http.status !== 200) { http.onerror(); return; }
      self.coordi.log.info('First view: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      if(data.view.length !== 0){
        var algoIds = Object.keys(self.coordi.workers);
        for(var i = 0; i < algoIds.length; i++)
          self.coordi.workers[ algoIds[i] ].postMessage({
            header: 'firstView',
            view: data.view
          });
      }else//just in case the server has any peer reference
        window.setTimeout(function(){ self.getFirstView(); }, 5000);
    };
    
    http.send(null);
  };
  
  Bootstrap.prototype.getNeighbour = function(){
    var http = new XMLHttpRequest();
    http.open('get', this.url + this.coordi.id + '/neighbour', true);
    var self = this;
    http.onerror = function(e) {
      self.coordi.log.error('Error while retrieving first neighbour');
      self.coordi._abort('server-error', 'No peer for doing first connection');
    };
    
    http.onreadystatechange = function() {
      if (http.readyState !== 4){ return; }
      if (http.status !== 200) { http.onerror(); return; }
      self.coordi.log.info('First view: ' + http.responseText);
      var data = JSON.parse(http.responseText);
      if(data){
        self.coordi.log.info('Doing first connection with: ' + data.neighbour);
        var msg = {
          service: 'VOID',
          emitter: self.coordi.id,
          receiver: data.neighbour
        };
        self.coordi.sendTo(msg);
      }else
        self.coordi.log.error('No peer for doing first connection');
    };
    
    http.send(null);
  };
  
  exports.Bootstrap = Bootstrap;
})(this);
