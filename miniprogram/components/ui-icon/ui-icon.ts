import { iconUri } from '../../core/icons';

Component({
  options: { addGlobalClass: true },
  properties: {
    name: { type: String, value: '' },
    color: { type: String, value: '#1E2A22' },
    size: { type: Number, value: 36 },
  },
  data: { uri: '' },
  observers: {
    'name, color': function (name: string, color: string) {
      this.setData({ uri: name ? iconUri(name, color) : '' });
    },
  },
});
