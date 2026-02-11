## Updating the Fluidsynth WASM bundle

1. **Ensure the toolchain is configured**  
   ```bash
   cd ~/emsdk
   source ./emsdk_env.sh
   ```
   The repo under `~/emsdk/fluidsynth` already contains the CMake build configured for Emscripten (`build-wasm`).

2. **Configure and rebuild libfluidsynth for WASM (no preloaded assets)**  
   - CMake configure (once):
     ```bash
     cd ~/Fluidsynth/fluidsynth-2.5.1
     mkdir -p build-wasm
     cd build-wasm
     cmake .. \
       -DCMAKE_TOOLCHAIN_FILE=$HOME/Documents/Websites/emsdk-main/upstream/emscripten/cmake/Modules/Platform/Emscripten.cmake \
       -Dosal=cpp11 \
       -Denable-alsa=OFF -Denable-dbus=OFF -Denable-pulseaudio=OFF -Denable-sdl2=OFF -Denable-jack=OFF -Denable-coreaudio=OFF -Denable-coremidi=OFF \
       -Denable-libsndfile=OFF -Denable-network=OFF -Denable-threads=OFF
     ```
   - Build static lib (if not already built):
     ```bash
     make -j4
     ```
   - Link the lightweight WASM/JS bundle (no `--preload-file` flags):
     ```bash
     cd ~/Fluidsynth/fluidsynth-2.5.1/build-wasm
     mkdir -p dist
     source $HOME/Documents/Websites/emsdk-main/emsdk_env.sh
     emcc src/libfluidsynth.a ./fluidsynth_glue.c \
       -I ../include -I ./include \
       -o dist/fluidsynth.js \
       -s EXPORTED_FUNCTIONS='["_malloc","_free","_new_fluid_settings","_delete_fluid_settings","_fluid_settings_setnum","_fluid_settings_setstr","_fluid_settings_setint","_new_fluid_synth","_delete_fluid_synth","_fluid_synth_sfload","_fluid_synth_bank_select","_fluid_synth_write_float","_fluid_synth_program_change","_new_fluid_player","_delete_fluid_player","_fluid_player_add","_fluid_player_play","_fluid_player_stop","_fluid_player_seek","_fluid_player_get_status","_fluid_player_get_current_tick","_fluid_player_get_total_ticks","_fluid_player_join","_fluid_player_set_bpm","_fluid_player_set_tempo","_fluid_player_set_loop","_fluid_synth_tune_notes","_fluid_synth_activate_tuning","_fluid_synth_all_notes_off"]' \
       -s EXPORTED_RUNTIME_METHODS='["cwrap","ccall","FS","HEAPF32","HEAPF64","HEAP32"]' \
       -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT='web' \
       -s INITIAL_MEMORY=268435456 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=1073741824
     ```
   The resulting `dist/fluidsynth.js` + `dist/fluidsynth.wasm` are small (~hundreds of KB) and rely on external soundfonts at runtime (e.g., `assets/soundfonts/mobile.sf3` or `FluidR3_GM.sf2`).

3. **Sync the site assets**  
   ```bash
   cd ~/Websites/Earchive2
   rm -rf assets/fluidsynth
   cp -R ~/Fluidsynth/fluidsynth-2.5.1/build-wasm/dist assets/fluidsynth
   ```
   The site now loads `assets/fluidsynth/fluidsynth.js`, `fluidsynth.wasm`, and `fluidsynth.data` directly.

Re-run the build whenever the Fluidsynth sources or glue layer change so the browser bundle stays in sync.
