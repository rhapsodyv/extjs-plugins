Ext.define('ICG.ux.CellEditingLikeExcel', {
    extend: 'Ext.grid.plugin.CellEditing',
    alias: 'plugin.cellEditingLikeExcel',
    pressedKeys: '',
    constructor: function (config) {
        var me = this;
        me.callParent(arguments);
        me.on("edit", function (editor, e) {
            if (me.wasEnterKey) {
                me.onEnterKey();
            }
        });
    },
    getEditor: function (record, column) {
        var me = this;
        var ed = this.callParent(arguments);
        if (!ed) {
            me.pressedKeys = '';
            return ed;
        }
        ed.field.on({
            'focus': {
                single: true,
                fn: function () {
                    if (me.pressedKeys != '') {
                        ed.field.setValue(me.pressedKeys);
                    }

                }
            },
            'blur': function () {
                me.pressedKeys = '';
            }
        });
        ed.on('specialkey', function (editor, field, evt) {
            var key = evt.getKey();
            if (key == evt.ENTER) {
                me.wasEnterKey = true;
            }
        });
        return ed;
    },
    initKeyNavHeaderEvents: function () {
        var me = this;

        Ext.EventManager.on(this.view.el.dom, 'keypress', function(evt, t, o) {
            var records = me.view.getSelectionModel().getSelection();
            var c = String.fromCharCode(evt.charCode || evt.keyCode);
            if (records.length != 1) {
                return;
            }
            me.pressedKeys += c;

            //TODO nao iniciar a edicao se a coluna nao for editavel!!
            me.startEdit(records[0], me.view.getSelectionModel().getCurrentPosition().column);
        });
        me.view.getSelectionModel().on('select', function () {
            me.pressedKeys = '';
        });

        this.callParent(arguments);
    },
    onEnterKey: function (e) {
        this.view.getSelectionModel().onKeyDown(e);
    }
});
