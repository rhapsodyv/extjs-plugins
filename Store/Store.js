Ext.define('ICG.store.TreeStore', {
	override: 'Ext.data.TreeStore',
	
	each: function(callback) {
		if(this.getRootNode()){
			return this.getRootNode().cascadeBy(function(node) {
				if (!node.isRoot()) {
					callback(node);
				}
				return true;
			});
		}
	}
});

Ext.define('ICG.store.Store', {
	override: 'Ext.data.AbstractStore',

	getNeedSync: function() {
		return (this.getNewRecords().length ||
			this.getUpdatedRecords().length ||
			this.getRemovedRecords().length);
	},

	loaded: false,

	load: function(options) {
		this.on('load', function(store){
			store.loaded = true;
		});
		this.callParent(arguments);
	},

	getIsLoaded: function() {
		return this.loaded;
	},

	computeStoresToSync: function(stores) {
		if (this.getNeedSync()) {
			stores.push(this);
		}
		this.each(function(rec) {
			rec.associations.each(function(assoc) {
				if (assoc.type == 'hasMany') {
					var store = rec[assoc.name]();
					store.computeStoresToSync(stores);
				}
			});
			return true;
		});
	},

	updateFk: function() {
		this.each(function(rec) {
			rec.associations.each(function(assoc) {
				if (assoc.type == 'hasMany') {
					var store = rec[assoc.name]();
					store.each(function(childRec) {
						childRec.set(assoc.foreignKey, rec.get(assoc.primaryKey));
					});
				}
			});
			return true;
		});
	},

	//objetivos:
	// - saber quando nao tem mais sync pra chamar as callbacks do usuario
	// - chamar os syncs dos registros filhos só depois do pai dar sucesso. Esses podem ser em paralelo
	// - chamar os sync dos filhos mesmo qdo o pai nao tem nada pra fazer

	syncAll: function(options) {
		var me = this;
		options = options || {};
		if (options.storesToSync === undefined) {
			options.storesToSync = [];
			this.computeStoresToSync(options.storesToSync);
		}

		store = options.storesToSync.shift();

		options = {
			scope: store,
			appOptions: options,
			storesToSync: options.storesToSync,
			success: function(batch, _options) {
				//console.log('master store success', _options.storesToSync);
				this.updateFk();
				if (_options.storesToSync.length > 0) {
					_options.storesToSync[0].syncAll(_options.appOptions);
				}
				else {
					Ext.callback(_options.appOptions.success, _options.appOptions.scope, [batch, _options.appOptions, this]);
				}
			},
			failure: function(batch, _options) {
				//console.log('master store failure', _options.storesToSync);
				_options.storesToSync = [];
				Ext.callback(_options.appOptions.failure, _options.appOptions.scope, [batch, _options.appOptions, this]);
			},
			callback: function(batch, _options) {
				//console.log('master store callback', _options.storesToSync);
				if (_options.storesToSync.length === 0) {
					Ext.callback(_options.appOptions.callback, _options.appOptions.scope, [batch, _options.appOptions, this]);
				}
			}
		};
		
		//soh chama a callback pq nao tem nada pra fazer
		if(store === undefined) {
			Ext.callback(options.appOptions.callback, options.appOptions.scope, [null, options.appOptions, this]);
		}
		else {
			store.sync(options);
		}
	}
});
