import { RequestStatus } from '../../../../../utils/consts';
import update from 'immutability-helper';
import uuid from 'uuid';
import createActionsHouse from '../../../../../actions/house';
import createActionsIntegration from '../../../../../actions/integration';
import debounce from 'debounce';
import { DEVICE_SUBSERVICE_LIST } from '../../../../../../../server/utils/constants';

function createActions(store) {
  const houseActions = createActionsHouse(store);
  const integrationActions = createActionsIntegration(store);
  const actions = {
    async getUsbPorts(state) {
      store.setState({
        getArduinoUsbPortStatus: RequestStatus.Getting
      });
      try {
        const usbPorts = await state.httpClient.get('/api/v1/service/usb/port');
        store.setState({
          usbPorts,
          getArduinoUsbPortStatus: RequestStatus.Success
        });
      } catch (e) {
        store.setState({
          getArduinoUsbPortStatus: RequestStatus.Error
        });
      }
    },
    async getArduinoDevices(state) {
      store.setState({
        getArduinoDevicesStatus: RequestStatus.Getting
      });
      try {
        const options = {
          order_dir: state.getArduinoDevicesOrderDir || 'asc'
        };
        if (state.arduinoDevicesSearch && state.arduinoDevicesSearch.length) {
          options.search = state.arduinoDevicesSearch;
        }
        const arduinoDevices = await state.httpClient.get('/api/v1/service/arduino/device', options);

        store.setState({
          arduinoDevices,
          getArduinoDevicesStatus: RequestStatus.Success
        });
      } catch (e) {
        store.setState({
          getArduinoDevices: RequestStatus.Error
        });
      }
    },
     async addDevice(state) {
      const uniqueId = uuid.v4();
      await integrationActions.getIntegrationByName(state, 'arduino');
      const devices = update(state.devices, {
        $push: [
          {
            id: uniqueId,
            name: null,
            external_id: uniqueId,
            service_id: store.getState().currentIntegration.id,
            features: [
              {
                name: null,
                selector: null,
                external_id: uniqueId,
                category: null,
                type: null,
                read_only: false,
                keep_history: false,
                has_feedback: false,
                min: 0,
                max: 0
              }
            ],
            params: [
              {
                name: 'name_param',
                value: null
              }
            ]
          }
        ]
      });
      store.setState({
        devices
      });
    },
    async saveDevice(state, index) {
      const device = state.arduinoDevices[index];
      const savedDevice = await state.httpClient.post('/api/v1/device', device);
      const newState = update(state, {
        arduinoDevices: {
          $splice: [[index, 1, savedDevice]]
        }
      });
      store.setState(newState);
    },
    updateDeviceProperty(state, index, property, value) {
      const newState = update(state, {
        arduinoDevices: {
          [index]: {
            [property]: {
              $set: value
            }
          }
        }
      });
      store.setState(newState);
    },
    async deleteDevice(state, device, index) {
      await state.httpClient.delete('/api/v1/device/' + device.selector);
      const newState = update(state, {
        arduinoDevices: {
          $splice: [[index, 1]]
        }
      });
      store.setState(newState);
    },
    async search(state, e) {
      store.setState({
        arduinoDeviceSearch: e.target.value
      });
      await actions.getArduinoDevices(store.getState(), 20, 0);
    },
    async changeOrderDir(state, e) {
      store.setState({
        getArduinoDeviceOrderDir: e.target.value
      });
      await actions.getArduinoDevices(store.getState(), 20, 0);
    },
    addDeviceFeature(state, index, category, type) {
      const uniqueId = uuid.v4();
      const arduinoDevices = update(state.arduinoDevices, {
        [index]: {
          features: {
            $push: [
              {
                id: uniqueId,
                category,
                type,
                read_only: true,
                has_feedback: false
              }
            ]
          }
        }
      });

      store.setState({
        arduinoDevices
      });
    },
    updateFeatureProperty(state, deviceIndex, featureIndex, property, value) {
      const arduinoDevices = update(state.arduinoDevices, {
        [deviceIndex]: {
          features: {
            [featureIndex]: {
              [property]: {
                $set: value
              }
            }
          }
        }
      });

      store.setState({
        arduinoDevices
      });
    },
    deleteFeature(state, deviceIndex, featureIndex) {
      const arduinoDevices = update(state.arduinoDevices, {
        [deviceIndex]: {
          features: {
            $splice: [[featureIndex, 1]]
          }
        }
      });

      store.setState({
        arduinoDevices
      });
    }
  };
  actions.debouncedSearch = debounce(actions.search, 200);
  return Object.assign({}, houseActions, integrationActions, actions);
}

export default createActions;
