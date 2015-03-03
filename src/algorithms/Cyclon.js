/** 
* @module lib/algorithms */
(function(exports){
  /**
  * @class Cyclon
  * @augments GossipProtocol
  * @description This class implements the goosip-based algorithm Cyclon. The local view is an
  * object where each property identifies a remote peer with ID "peerId"; properties point to 
  * a vector with two entries, the first one contains the age (integer) of the vector and the 
  * second one is the data owned by the peer "peerId".
  * @param opts {Object} - properties to set by the object Cyclon
  * @author Raziel Carvajal <raziel.carvajal-gomez@inria.fr> */
  function Cyclon(algOpts, log, gossipUtil){
    GossipProtocol.call(this, algOpts, log, gossipUtil);
  }
  
  GossipUtil.inherits(Cyclon, GossipProtocol);
  /**
  * @description This object represents the configuration by default of this protocol. During the
  * instantiation of this object (via the Factory object) if the options are not defined
  * the default configuration will be taken into account. 
  * @property {Object} defaultOpts - Default configuration of this gossip-based protocol.
  * @default */
  Cyclon.defaultOpts = {
    class: 'Cyclon',
    data: '?',
    viewSize: 10,
    fanout: 5,
    periodTimeOut: 10000,
    propagationPolicy: { push: true, pull: true }
  };
  /** 
  * @description This method selects the remote peer's identifier with the oldest age.See method 
  * GossipProtocol.selectPeer() for more information.*/
  Cyclon.prototype.selectPeer = function(){ return this.gossipUtil.getOldestKey(this.view); };
  /***/
  Cyclon.prototype.setMediator = function(mediator){ this.gossipMediator = mediator; };
  /** 
  * @description This method initialize GossipProtocol.view with the peer identifiers n the array keys.
  * @method initialize
  * @param keys:Array - Array of peer identifiers. */
  Cyclon.prototype.initialize = function(keys){
    if(keys.length > 0){
      var i = 0;
      while(i < this.viewSize && i < keys.length){
        this.view[ keys[i].id ] = this.gossipUtil.newItem(0, keys[i].profile);
        i++;
      }
    }
    this.log.info('initialization of view: ' + JSON.stringify(this.view));
  };
  /**
  * @method selectItemsToSend
  * @description The selection of peers is performed in a randomly way.See method 
  * GossipProtocol.selectItemsToSend() for more information.*/
  Cyclon.prototype.selectItemsToSend = function(thread){
    var dstPeer = this.selectPeer();
    var subDict = {}, clone = JSON.parse(JSON.stringify(this.view));
    switch( thread ){
      case 'active':
        delete clone[dstPeer];
        subDict = this.gossipUtil.getRandomSubDict(this.fanout - 1, clone);
        subDict[this.peerId] = this.gossipUtil.newItem(0, this.data);
        break;
      case 'passive':
        subDict = this.gossipUtil.getRandomSubDict(this.fanout, this.clone);
        break;
      default:
        this.log.error('Unknown selection policy');
        break;
    }
    var msg = {
      header: 'activeMsg',
      emitter: this.peerId,
      receiver: dstPeer,
      payload: subDict,
      algoId: this.algoId
    };
    this.gossipMediator.postInMainThread(msg);
  };
  /**
  * @method selectItemsToKeep
  * @description See method GossipProtocol.selectItemsToKeep() for more information.*/
  Cyclon.prototype.selectItemsToKeep = function(rcvCache){
    var rcvKeys = Object.keys(rcvCache);
    if( rcvKeys.length === 0 ){ return; }
    var i, currentKeys = Object.keys(this.view);
    if( currentKeys.length === 0 ){
      i = 0;
      do{
        this.view[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
        i += 1;
      }while(i < rcvKeys.length && Object.keys(this.view).length < this.viewSize);
    }else{
      var newCache = {};
      if(this.algoId in rcvCache){
        delete rcvCache[this.algoId];
        rcvKeys = Object.keys(rcvCache);
      }
      for(i = 0; i < rcvKeys.length; i++){
        if( !(rcvKeys[i] in this.view) )
          newCache[ rcvKeys[i] ] = rcvCache[ rcvKeys[i] ];
      }
      i = 0;
      while( Object.keys(newCache).length < this.viewSize && i < currentKeys.length ){
        newCache[ currentKeys[i] ] = this.view[ currentKeys[i] ];
        i += 1;
      }
      var keys = Object.keys(this.view);
      for(i = 0; i < keys.length; i++){ delete this.view[ keys[i] ]; }
      keys = Object.keys(newCache);
      for(i = 0; i < keys.length; i++){ this.view[ keys[i] ] = newCache[ keys[i] ];}
    }
  };
  /** 
  * @method increaseAge
  * @description See method GossipProtocol.increaseAge() for more information.*/
  Cyclon.prototype.increaseAge = function(){
    var keys = Object.keys(this.view);
    for( var i = 0; i < keys.length; i++ ){ this.view[keys[i]].age++; }
  };
  /** 
  * @method setData 
  * @description This method updates the value of of one item in GossipProtocol.view
  * @param {String} key - ID of the item to update.
  * @param {Object} data - New value for the data property*/
  Cyclon.prototype.setData = function(key, data){ this.view[key].data = data; };
  
  exports.Cyclon = Cyclon;
  
})(this);
