<template>
    <div class="modal">
        <div class="modal-mask">
            <div class="modal-wrapper">
                <div class="modal-container" @keydown.27="cancel()" @keydown.enter="save()">
                    <a class="inline close-button" href="javascript:void(0);" @click="cancel()"><i class="fas fa-times"></i></a>
                    <a class="close-button" href="javascript:;" @click="openHelp()"><i class="fas fa-question-circle"></i></a>
                    <div class="modal-header">
                        <h1 name="header" data-i18n="">Eye-Tracking Input // Augensteuerung-Eingabe</h1>
                    </div>

                    <div class="modal-body" v-if="inputConfig">
                        <div class="row">
                            <span data-i18n="">Eye-Tracking input method: 1 input event // Eingabemethode Augensteuerung: 1 Eingabekanal</span>
                            <a aria-label="Help" href="javascript:;" @click="openHelp()"><i class="fas blue fa-question-circle"></i></a>
                        </div>
                        <div class="row">
                            <div class="twelve columns">
                                <input v-focus type="checkbox" id="enableEyeTracking" v-model="inputConfig.eyeTrackingEnabled">
                                <label class="inline" for="enableEyeTracking" data-i18n="">Enable Eye-Tracking // Augensteuerung aktivieren</label>
                            </div>
                        </div>
                        <div v-show="inputConfig.eyeTrackingEnabled">
                            <accordion acc-label="Input // Eingabe" acc-open="true" acc-label-type="h2" acc-background-color="white" class="row">
                                <input-event-list v-model="inputConfig.eyeTrackingInputs" :input-labels="[InputConfig.SELECT]" :error-inputs="errorInputs" @input="inputChanged"></input-event-list>
                                <div class="row">
                                    <button class="twelve columns" data-i18n="" @click="resetInput">Reset to default input configuration // Auf Standard Eingabe-Konfiguration zurücksetzen</button>
                                </div>
                            </accordion>
                            <accordion acc-label="ADVANCED_SETTINGS" acc-label-type="h2" acc-background-color="white">
                                <div class="row">
                                    <div class="twelve columns">
                                        <label for="eye-tracking-provider-select" class="six columns" data-i18n>Choose a gaze estimation provider // Wählen Sie eine Technologie</label>
                                        <select id="eye-tracking-provider-select" class="six columns" v-model="inputConfig.eyeTrackingProvider">
                                            <option v-for="(provider, i) of JSON.parse(JSON.stringify(InputConfig.DEFAULT_EYE_PROVIDER))" :key="i" :value="provider">{{provider}}</option>
                                        </select>
                                    </div>
                                </div>
                            </accordion>
                            <accordion acc-label="TEST_CONFIGURATION" acc-label-type="h2" acc-background-label="white" @open="testOpen = true; initTest();" @close="testOpen = false; stopTest()">
                                <!-- Do stuff -->
                            </accordion>
                        </div>
                    </div>

                    <div class="modal-footer">
                        <div class="button-container row">
                            <button @click="cancel()" class="four columns offset-by-four">
                                <i class="fas fa-times" /> <span data-i18n>Cancel // Abbrechen</span>
                            </button>
                            <button @click="save()" class="four columns">
                                <i class="fas fa-check" /> <span>OK</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import {dataService} from '../../../js/service/data/dataService';
    import {helpService} from "../../../js/service/helpService";
    import {i18nService} from "../../../js/service/i18nService";
    import Accordion from "../../components/accordion.vue";
    import InputEventList from "../../components/inputEventList.vue";
    import './../../../css/modal.css';
    import {InputConfig} from "../../../js/model/InputConfig";
    import {inputEventHandler} from "../../../js/input/inputEventHandler";

    export default {
        props: [],
        components: {Accordion, InputEventList},
        data: function() {
            return {
                inputConfig: null,
                metadata: null,
                InputConfig: InputConfig,
                error: '',
                errorInputs: [],
                eyeTrackingInput: null,
                testOpen: false,
            }
        },
        methods: {
            save() {
                // if (!this.validateInputs()) { // FIXME
                //     return;
                // }
                this.metadata.inputConfig = this.inputConfig;
                dataService.saveMetadata(this.metadata).then(() => {
                    this.$emit('close')
                })
            },
            cancel() {
                this.$emit('close');
            },
            openHelp() {
                helpService.openHelp();
            },
            validateInputs() {
                this.errorInputs = [];
                this.error = "";
                if (!this.inputConfig.eyeTrackingEnabled) {
                    return true;
                }
                // FIXME: Selection via Keyboard only optional
                // if (this.inputConfig.scanInputs.filter(input => input.label === InputConfig.SELECT).length === 0) {
                //     this.errorInputs.push(InputConfig.SELECT);
                // }

                // if (this.errorInputs.length > 0) {
                //     this.error = i18nService.translate('Please specify input modalities // Bitte Eingabemodalitäten definieren');
                //     return false;
                // }
                return true;
            },
            inputChanged() {
                if (this.error) {
                    this.validateInputs();
                }
            },
            resetInput() {
                this.$set(this.inputConfig, 'eyeTrackingInputs', JSON.parse(JSON.stringify(InputConfig.DEFAULT_EYE_INPUTS)));
                this.inputChanged();
            },
            initTest() {
                // Do stuff
            },
            stopTest() {
                // Do stuff
            },
        },
        mounted () {
            let thiz = this;
            inputEventHandler.pauseAll();
            dataService.getMetadata().then(metadata => {
                thiz.metadata = JSON.parse(JSON.stringify(metadata));
                thiz.inputConfig = JSON.parse(JSON.stringify(metadata.inputConfig));
                // thiz.inputConfig.eyeTrackingProvider = JSON.parse(JSON.stringify(metadata.inputConfig.eyeTrackingProvider|| InputConfig.EYE_TRACKING_PROVIDER_GAZECLOUD));
                thiz.inputConfig.eyeTrackingProvider = JSON.parse(JSON.stringify(metadata.inputConfig.eyeTrackingProvider|| InputConfig.EYE_TRACKING_PROVIDER_WEBGAZER));
            });
            // helpService.setHelpLocation('04_input_options', '#eye-tracking'); // FIXME
        },
        updated () {
            i18nService.initDomI18n();
        },
        beforeDestroy() {
            helpService.revertToLastLocation();
            inputEventHandler.resumeAll();
        }
    };
</script>

<style></style>
