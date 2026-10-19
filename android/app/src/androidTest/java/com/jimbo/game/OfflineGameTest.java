package com.jimbo.game;

import android.webkit.WebView;
import android.content.pm.ActivityInfo;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OfflineGameTest {
    private WebView web;
    private MainActivity currentActivity;
    private void bindActivity(MainActivity previous) throws Exception {
        long end = System.currentTimeMillis() + 10000;
        while (System.currentTimeMillis() < end) {
            AtomicReference<MainActivity> found = new AtomicReference<>();
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                for (android.app.Activity candidate : androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance().getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED)) {
                    if (candidate instanceof MainActivity && candidate != previous) found.set((MainActivity) candidate);
                }
                if (found.get() != null) { currentActivity = found.get(); web = currentActivity.getBridge().getWebView(); }
            });
            if (found.get() != null) return;
            Thread.sleep(50);
        }
        fail("Main activity did not resume");
    }
    private void recreateActivity() throws Exception {
        MainActivity previous = currentActivity;
        InstrumentationRegistry.getInstrumentation().runOnMainSync(previous::recreate);
        bindActivity(previous);
    }
    private String js(String script) throws Exception {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<String> result = new AtomicReference<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.evaluateJavascript(script, value -> { result.set(value); latch.countDown(); }));
        assertTrue("WebView response", latch.await(10, TimeUnit.SECONDS));
        return result.get();
    }
    private void until(String expression) throws Exception {
        long end = System.currentTimeMillis() + 20000;
        while (System.currentTimeMillis() < end) {
            if ("true".equals(js("Boolean(document.body) && (" + expression + ")"))) return;
            Thread.sleep(100);
        }
        fail("Timed out: " + expression + " Body: " + js("document.body.innerText"));
    }
    private void clickText(String text) throws Exception {
        until("Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('" + text + "') && !b.disabled)");
        js("Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('" + text + "')).click()");
    }
    private void reloadLocal(ActivityScenario<MainActivity> scenario) throws Exception {
        String query = "?test=" + System.nanoTime();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("https://localhost/" + query));
        until("location.search === " + JSONObject.quote(query) + " && document.querySelector('main') !== null");
    }
    @Test public void TC122_offlineStartRestoreAndBack() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
            bindActivity(null);
            until("location.origin === 'https://localhost' && document.querySelector('main') !== null");
            js("localStorage.removeItem('jimbo:run'); localStorage.setItem('jimbo:locale','en')");
            reloadLocal(scenario);
            until("document.body.innerText.includes('Start game')");
            assertTrue(js("location.href").contains("localhost"));
            assertEquals("true", js("Array.from(document.images).every(i => i.complete)"));
            clickText("Start game");
            until("document.querySelectorAll('[data-motion-id]').length >= 8 && document.querySelector('main').dataset.motionStage === 'idle'");
            js("document.querySelector('[role=group][aria-label=\"Your hand\"] button').click()");
            clickText("Clear selection");
            assertEquals("0", js("document.querySelectorAll('[aria-pressed=true]').length"));
            js("document.querySelector('[role=group][aria-label=\"Your hand\"] button').click()");
            clickText("Discard");
            until("document.querySelector('[data-testid=discards]').textContent.trim() === '3' && document.querySelector('main').dataset.motionStage === 'idle'");
            String hand = js("Array.from(document.querySelectorAll('[role=group][aria-label=\"Your hand\"] button')).map(b=>b.getAttribute('aria-label')).join('|')");
            String save = js("localStorage.getItem('jimbo:run')");
            assertNotEquals("null", save);
            recreateActivity();
            bindActivity(null);
            until("document.body.innerText.includes('Continue')");
            clickText("Continue");
            until("document.querySelector('[role=group][aria-label=\"Your hand\"] button') !== null");
            assertEquals(hand, js("Array.from(document.querySelectorAll('[role=group][aria-label=\"Your hand\"] button')).map(b=>b.getAttribute('aria-label')).join('|')"));
            assertEquals(save, js("localStorage.getItem('jimbo:run')"));
            js("document.querySelector('.draw-pile').click()");
            until("document.querySelector('dialog[open]') !== null");
            assertEquals("52", js("document.querySelectorAll('[data-deck-status]').length"));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.getOnBackPressedDispatcher().onBackPressed());
            until("document.querySelector('dialog[open]') === null");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.getOnBackPressedDispatcher().onBackPressed());
            until("document.body.innerText.includes('Return to the main menu?')");
            js("Array.from(document.querySelectorAll('dialog button')).find(b => b.textContent.trim() === 'Main menu').click()");
            until("document.body.innerText.includes('Continue')");
            } finally {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("about:blank"));
            }
        }
    }
    @Test public void TC131_forcedClearIntroLongPressAndRotation() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
            bindActivity(null);
            until("location.origin === 'https://localhost' && document.querySelector('main') !== null");
            String fixture;
            try (java.io.InputStream input = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("forced-run.json")) {
                fixture = new String(input.readAllBytes(), StandardCharsets.UTF_8);
            }
            js("localStorage.setItem('jimbo:run', " + JSONObject.quote(fixture) + "); localStorage.setItem('jimbo:locale','en')");
            reloadLocal(scenario);
            until("document.body.innerText.includes('Continue · Round 3')");
            clickText("Continue");
            until("document.querySelector('.penalty-intro[open]') !== null");
            assertEquals("true", js("Array.from(document.querySelectorAll('.hand-row button')).every(b=>b.disabled)"));
            String save = js("localStorage.getItem('jimbo:run')");
            until("document.querySelector('.penalty-intro') === null");
            assertEquals(save, js("localStorage.getItem('jimbo:run')"));
            js("document.querySelector('.hand-row button:not(.forced)').click()");
            js("document.querySelectorAll('.hand-row button:not(.forced)')[1].click()");
            until("document.querySelectorAll('.hand-row [aria-pressed=true]').length === 3");
            clickText("Clear selection");
            until("document.querySelectorAll('.hand-row [aria-pressed=true]').length === 1");
            assertEquals("true", js("document.querySelector('.hand-row .forced').getAttribute('aria-pressed') === 'true'"));
            assertEquals("true", js("document.querySelector('.clear-selection').disabled"));
            assertEquals(save, js("localStorage.getItem('jimbo:run')"));
            assertEquals("\"none\"", js("getComputedStyle(document.querySelector('main')).userSelect"));
            AtomicReference<Boolean> consumed = new AtomicReference<>();
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> consumed.set(web.performLongClick()));
            assertTrue("Native text long-press is consumed", consumed.get());
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE));
            until("innerWidth > innerHeight");
            assertEquals(save, js("localStorage.getItem('jimbo:run')"));
            assertEquals("true", js("document.documentElement.scrollWidth <= innerWidth"));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
            until("innerHeight > innerWidth");
            assertEquals(save, js("localStorage.getItem('jimbo:run')"));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.getOnBackPressedDispatcher().onBackPressed());
            until("document.body.innerText.includes('Return to the main menu?')");
            js("Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.trim()==='Main menu').click()");
            clickText("Continue");
            until("document.querySelector('.penalty-intro[open]') !== null");
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.getOnBackPressedDispatcher().onBackPressed());
            until("document.querySelector('.penalty-intro') === null");
            } finally {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("about:blank"));
            }
        }
    }

    @Test public void TC136_compactLayoutsAndImmediateDeselection() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
            bindActivity(null);
            until("location.origin === 'https://localhost' && document.querySelector('main') !== null");
            JSONObject runs;
            try (java.io.InputStream input = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("layout-runs.json")) {
                runs = new JSONObject(new String(input.readAllBytes(), StandardCharsets.UTF_8));
            }
            for (String locale : new String[]{"en", "zh-CN"}) {
                for (int orientation : new int[]{ActivityInfo.SCREEN_ORIENTATION_PORTRAIT, ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE}) {
                    InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.setRequestedOrientation(orientation));
                    until(orientation == ActivityInfo.SCREEN_ORIENTATION_PORTRAIT ? "innerHeight > innerWidth" : "innerWidth > innerHeight");
                    for (String page : new String[]{"playing", "result", "shop", "pack", "fullPack"}) {
                        js("localStorage.setItem('jimbo:locale', " + JSONObject.quote(locale) + ");localStorage.setItem('jimbo:run', " + JSONObject.quote(runs.getString(page)) + ");");
                        String query = "?layout=" + System.nanoTime();
                        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("https://localhost/" + query));
                        String label = locale.equals("en") ? "Continue" : "继续游戏";
                        until("location.search === " + JSONObject.quote(query) + " && document.querySelector('main') !== null && Array.from(document.querySelectorAll('button')).some(b=>b.textContent.includes('" + label + "'))");
                        clickText(label);
                        until("document.querySelector('main').dataset.phase !== 'ready'");
                        js("document.querySelector('.penalty-intro button')?.click()");
                        until("document.querySelector('.penalty-intro') === null");
                        until("Array.from(document.querySelectorAll('.shop-offer,.shop,.result-panel')).every(e=>e.getAnimations().every(a=>a.playState==='finished'))");
                        android.graphics.Bitmap shot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
                        java.io.File file = new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null), "compact-"+locale+"-"+orientation+"-"+page+".png");
                        try(java.io.FileOutputStream output=new java.io.FileOutputStream(file)){shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,output);}
                        shot.recycle();
                        until("Array.from(document.querySelectorAll('.shop-offer')).every(e=>e.getAnimations().every(a=>a.playState==='finished'))");
                        String dimensions = js("JSON.stringify({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight})");
                        dimensions += js("JSON.stringify(Array.from(document.querySelectorAll('.sidebar,.side-actions,.shop,.shop-heading,.shop-offers,.shop-actions,.offer-meta,.shop-offer>.button')).map(e=>({c:e.className,top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})))");
                        assertEquals(locale + " " + page + " " + dimensions, "true", js("document.documentElement.scrollWidth<=innerWidth+1 && document.documentElement.scrollHeight<=innerHeight+1"));
                        assertEquals(locale + " " + page + " buttons", "true", js("Array.from(document.querySelectorAll('main button')).filter(b=>b.getClientRects().length).every(b=>{const r=b.getBoundingClientRect();return r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1})"));
                        assertEquals(locale + " " + page + " offer overlap", "true", js("Array.from(document.querySelectorAll('.shop-offer')).every(e=>{const m=e.querySelector('.offer-meta'),b=e.querySelector(':scope > .button');return !m||!b||m.getBoundingClientRect().bottom<=b.getBoundingClientRect().top+1})"));
                        assertEquals(locale + " " + page + " offer contents", "true", js("Array.from(document.querySelectorAll('.shop-offer')).every(e=>{const r=e.getBoundingClientRect();return Array.from(e.querySelectorAll('.offer-meta,:scope > .button')).every(c=>{const b=c.getBoundingClientRect();return b.top>=r.top-1&&b.bottom<=r.bottom+1})})"));
                        if (page.equals("playing")) {
                            String transform = js("getComputedStyle(document.querySelector('.hand-row button')).transform");
                            js("document.querySelector('.hand-row button').click()");
                            js("document.querySelector('.hand-row button').click()");
                            assertEquals(transform, js("getComputedStyle(document.querySelector('.hand-row button')).transform"));
                            assertEquals("\"0s\"", js("getComputedStyle(document.querySelector('.hand-row button')).transitionDuration"));
                        }

                    }
                }
            }
            } finally {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("about:blank"));
            }
        }
    }

    private void tap(String selector) throws Exception {
        String rect = js("(()=>{const r=document.querySelector(" + JSONObject.quote(selector) + ").getBoundingClientRect();return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth})})()");
        JSONObject point = new JSONObject(new org.json.JSONTokener(rect).nextValue().toString());
        float x = (float) point.getDouble("x"), y = (float) point.getDouble("y"), width = (float) point.getDouble("width");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            float scale = web.getWidth() / width;
            long time = android.os.SystemClock.uptimeMillis();
            android.view.MotionEvent down = android.view.MotionEvent.obtain(time, time, android.view.MotionEvent.ACTION_DOWN, x * scale, y * scale, 0);
            android.view.MotionEvent up = android.view.MotionEvent.obtain(time, time + 80, android.view.MotionEvent.ACTION_UP, x * scale, y * scale, 0);
            web.dispatchTouchEvent(down); web.dispatchTouchEvent(up); down.recycle(); up.recycle();
        });
    }
    @Test public void TC142_offlineAudioSettingsAndBackground() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
            bindActivity(null);
            until("document.querySelector('main') !== null");
            js("localStorage.removeItem('jimbo:settings');localStorage.removeItem('jimbo:run');localStorage.setItem('jimbo:locale','en')");
            reloadLocal(scenario);
            until("document.body.innerText.includes('Start game')");
            assertEquals("true", js("document.querySelector('audio').paused"));
            tap(".welcome-actions .button");
            until("document.querySelector('audio').currentTime > 0.2 && !document.querySelector('audio').paused");
            assertEquals("true", js("document.querySelector('audio').loop"));
            until("document.querySelector('main').dataset.motionStage === 'idle'");
            assertEquals("true", js("Array.from(document.querySelectorAll('.hand-row .playing-card')).every(c=>{const r=c.querySelector('.card-corner b').textContent;return ['J','Q','K'].includes(r)?c.querySelectorAll('[data-court-half]').length===2:c.querySelectorAll('[data-pip]').length===(r==='A'?1:Number(r))})"));
            InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> currentActivity.moveTaskToBack(true));
            until("document.querySelector('audio').paused");
            android.content.Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
            context.startActivity(new android.content.Intent(context, MainActivity.class).addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_REORDER_TO_FRONT));
            until("!document.querySelector('audio').paused");
            clickText("Main menu");
            until("document.querySelector('dialog[open]') !== null");
            js("Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.trim()==='Main menu').click()");
            clickText("Settings");
            js("Array.from(document.querySelectorAll('.setting-row')).find(l=>l.textContent.includes('Background music')).querySelector('input').click()");
            js("Array.from(document.querySelectorAll('.setting-row')).find(l=>l.textContent.includes('Sound effects')).querySelector('input').click()");
            until("document.querySelector('audio').paused");
            clickText("Save settings");
            until("document.querySelector('audio').paused");
            assertEquals("false", js("JSON.parse(localStorage.getItem('jimbo:settings')).audio.music"));
            assertEquals("false", js("JSON.parse(localStorage.getItem('jimbo:settings')).audio.effects"));
            recreateActivity(); bindActivity(null);
            until("document.body.innerText.includes('Continue')");
            tap(".welcome-actions .button");
            until("document.querySelector('.hand-row button') !== null");
            assertEquals("true", js("document.querySelector('audio').paused"));
            clickText("Main menu");
            until("document.querySelector('dialog[open]') !== null");
            js("Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.trim()==='Main menu').click()");
            clickText("Settings");
            js("Array.from(document.querySelectorAll('.setting-row')).find(l=>l.textContent.includes('Sound effects')).querySelector('input').click()");
            clickText("Save settings");
            tap(".welcome-actions .button");
            until("document.querySelector('.hand-row button:not(:disabled)') !== null");
            tap(".hand-row button");
            android.media.AudioManager manager = (android.media.AudioManager) InstrumentationRegistry.getInstrumentation().getTargetContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            long deadline = System.currentTimeMillis() + 2000;
            while (!manager.isMusicActive() && System.currentTimeMillis() < deadline) Thread.sleep(10);
            assertTrue("Sound effect reaches Android audio output while music is disabled", manager.isMusicActive());
            assertEquals("true", js("document.querySelector('audio').paused"));
            } finally {
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> web.loadUrl("about:blank"));
            }
        }
    }

    private JSONObject interactionFixtures() throws Exception {
        try (java.io.InputStream input = InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("interaction-runs.json")) {
            return new JSONObject(new String(input.readAllBytes(), StandardCharsets.UTF_8));
        }
    }
    private void loadInteractionRun(ActivityScenario<MainActivity> scenario, String run, String speed) throws Exception {
        js("localStorage.setItem('jimbo:locale','en');localStorage.setItem('jimbo:run'," + JSONObject.quote(run) + ");localStorage.setItem('jimbo:settings',JSON.stringify({version:6,animation:" + JSONObject.quote(speed) + ",crt:true,audio:{music:false,effects:false,musicVolume:30,effectsVolume:65},rules:JSON.parse(" + JSONObject.quote(run) + ").state.rules}))");
        reloadLocal(scenario);
        until("document.body.innerText.includes('Continue')");
        clickText("Continue");
        until("document.querySelector('main').dataset.phase !== 'ready'");
        js("document.querySelector('.penalty-intro button')?.click()");
        until("document.querySelector('.penalty-intro') === null");
    }
    private void dragJoker(String from, String to, boolean cancel) throws Exception {
        String data = js("JSON.stringify([" + JSONObject.quote(from) + "," + JSONObject.quote(to) + "].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth}}))");
        org.json.JSONArray points = new org.json.JSONArray(new org.json.JSONTokener(data).nextValue().toString());
        float x1=(float)points.getJSONObject(0).getDouble("x"),y1=(float)points.getJSONObject(0).getDouble("y"),x2=(float)points.getJSONObject(1).getDouble("x"),y2=(float)points.getJSONObject(1).getDouble("y"),width=(float)points.getJSONObject(0).getDouble("width");
        long start=android.os.SystemClock.uptimeMillis();
        for (int i=0;i<=19;i++) {
            final int action=i==0?android.view.MotionEvent.ACTION_DOWN:i==19?(cancel?android.view.MotionEvent.ACTION_CANCEL:android.view.MotionEvent.ACTION_UP):android.view.MotionEvent.ACTION_MOVE;
            final float ratio=Math.min(1,i/18f),x=x1+(x2-x1)*ratio,y=y1+(y2-y1)*ratio;
            InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{float scale=web.getWidth()/width;android.view.MotionEvent event=android.view.MotionEvent.obtain(start,android.os.SystemClock.uptimeMillis(),action,x*scale,y*scale,0);web.dispatchTouchEvent(event);event.recycle();});
            Thread.sleep(20);
        }
    }
    @Test public void TC146_touchReorderAndFullRackPack() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
                bindActivity(null); until("document.querySelector('main') !== null");
                JSONObject fixtures=interactionFixtures();
                loadInteractionRun(scenario,fixtures.getString("fullShop"),"normal");
                String before=js("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))");
                js("window.expectedOrder=Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId));expectedOrder.push(expectedOrder.shift())");
                dragJoker(".joker-card:first-child",".joker-card:nth-child(6)",false);
                until("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))===JSON.stringify(expectedOrder)");
                assertEquals("true",js("JSON.stringify(JSON.parse(localStorage.getItem('jimbo:run')).state.jokers.map(c=>c.id))===JSON.stringify(expectedOrder)"));
                assertEquals("true",js("document.querySelector('dialog[open]')===null && document.querySelector('.joker-drag-ghost')===null"));
                String moved=js("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))");
                assertNotEquals(before,moved);
                dragJoker(".joker-card:first-child",".joker-card:nth-child(6)",true);
                assertEquals(moved,js("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))"));
                reloadLocal(scenario); clickText("Continue"); until("document.querySelector('.shop')!==null");
                assertEquals(moved,js("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))"));
                tap(".joker-card:first-child"); until("document.querySelector('dialog[open]')!==null");
                clickText("Move right");
                assertNotEquals(moved,js("JSON.stringify(Array.from(document.querySelectorAll('.joker-card')).map(c=>Number(c.dataset.jokerId)))"));
                js("document.querySelector('dialog .icon-button').click()");
                assertEquals("true",js("document.querySelectorAll('.joker-card').length===6 && !document.querySelector('.pack-offer>.button').disabled"));
                js("document.querySelector('.pack-offer>.button').click()"); until("document.querySelector('.shop.is-pack')!==null");
                assertEquals("true",js("document.querySelectorAll('.joker-card').length===6 && Array.from(document.querySelectorAll('.shop-offer>.button')).every(b=>b.disabled)"));
                String choices=js("JSON.stringify(JSON.parse(localStorage.getItem('jimbo:run')).state.pack.choices)");
                String money=js("JSON.parse(localStorage.getItem('jimbo:run')).state.money");
                reloadLocal(scenario); clickText("Continue"); until("document.querySelector('.shop.is-pack')!==null");
                assertEquals(choices,js("JSON.stringify(JSON.parse(localStorage.getItem('jimbo:run')).state.pack.choices)"));
                assertEquals(money,js("JSON.parse(localStorage.getItem('jimbo:run')).state.money"));
                tap(".joker-card:first-child"); until("document.querySelector('dialog[open]')!==null");
                js("document.querySelector('.joker-inspector .gold-button').click()");
                until("document.querySelectorAll('.joker-card').length===5");
                assertEquals(choices,js("JSON.stringify(JSON.parse(localStorage.getItem('jimbo:run')).state.pack.choices)"));
                js("document.querySelector('.shop-offer>.button').click()"); until("document.querySelectorAll('.joker-card').length===6");
                assertEquals("\"spent\"",js("JSON.parse(localStorage.getItem('jimbo:run')).state.pack.status"));
            } finally { InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.loadUrl("about:blank")); }
        }
    }
    @Test public void TC147_fullscreenOutcomesAndReplay() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            try {
                bindActivity(null); until("document.querySelector('main') !== null");
                JSONObject fixtures=interactionFixtures();
                for (String outcome:new String[]{"Win","Loss"}) for (int orientation:new int[]{ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE}) {
                    InstrumentationRegistry.getInstrumentation().runOnMainSync(()->currentActivity.setRequestedOrientation(orientation));
                    until(orientation==ActivityInfo.SCREEN_ORIENTATION_PORTRAIT?"innerHeight>innerWidth":"innerWidth>innerHeight");
                    loadInteractionRun(scenario,fixtures.getString("near"+outcome),orientation==ActivityInfo.SCREEN_ORIENTATION_PORTRAIT?"normal":"instant");
                    org.json.JSONArray ids=fixtures.getJSONObject(outcome.equals("Win")?"winAction":"lossAction").getJSONArray("ids");
                    for (int i=0;i<ids.length();i++) {
                        js("document.querySelector('.hand-row [data-motion-id=\""+ids.getInt(i)+"\"]').click()");
                        until("document.querySelectorAll('.hand-row [aria-pressed=true]').length==="+(i+1));
                    }
                    js("document.querySelector('.play-button').click()");
                    until("document.querySelector('.end-screen')!==null");
                    assertEquals("true",js("document.querySelector('.sidebar,.board,.result-score,.reward-breakdown')===null"));
                    assertEquals(JSONObject.quote(outcome.equals("Win")?"YOU WIN!":"GAME OVER"),js("document.querySelector('.end-title').textContent"));
                    if (orientation==ActivityInfo.SCREEN_ORIENTATION_PORTRAIT) {
                        assertEquals("\"intro\"",js("document.querySelector('.end-screen').dataset.outcomePhase"));
                        js("document.querySelector('.end-skip').click()");
                    }
                    until("document.querySelector('.end-screen').dataset.outcomePhase==='ready'");
                    assertEquals("true",js("document.documentElement.scrollHeight<=innerHeight+1 && document.documentElement.scrollWidth<=innerWidth+1"));
                    assertEquals("true",js("Array.from(document.querySelectorAll('.end-actions button')).every(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth})"));
                    android.graphics.Bitmap shot=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
                    java.io.File file=new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"outcome-"+outcome+"-"+orientation+".png");
                    try(java.io.FileOutputStream output=new java.io.FileOutputStream(file)){shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,output);}shot.recycle();
                    clickText("Play again"); until("document.querySelector('main').dataset.phase==='playing'");
                    assertEquals("true",js("JSON.parse(localStorage.getItem('jimbo:run')).state.round===1 && JSON.parse(localStorage.getItem('jimbo:run')).state.jokers.length===0"));
                    until("document.querySelector('main').dataset.motionStage==='idle'");
                }
            } finally { InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.loadUrl("about:blank")); }
        }
    }

    private void tapTutorialCard(int id, boolean selected) throws Exception {
        tap("[data-tutorial-card=\""+id+"\"]");
        until("document.querySelector('[data-tutorial-card=\""+id+"\"]').getAttribute('aria-pressed')==='"+selected+"'");
    }
    private void assertTutorialFits() throws Exception {
        until("document.querySelector('.tutorial-page').getAnimations().every(a=>a.playState==='finished')");
        String dimensions=js("JSON.stringify({w:innerWidth,h:innerHeight,step:document.querySelector('.tutorial-content').dataset.tutorialStep})");
        assertEquals(dimensions,"true",js("(()=>{const d=document.querySelector('.tutorial-dialog');return d.scrollHeight<=d.clientHeight+1&&d.scrollWidth<=d.clientWidth+1})()"));
        assertEquals(dimensions+" footer overlap","true",js("(()=>{const p=document.querySelector('.tutorial-page'),f=document.querySelector('.tutorial-footer');return Array.from(p.children).every(e=>e.getBoundingClientRect().bottom<=f.getBoundingClientRect().top+1)})()"));
        assertEquals(dimensions+" illustration overflow","true",js("Array.from(document.querySelectorAll('.tutorial-illustration')).every(e=>e.scrollHeight<=e.clientHeight+1&&e.scrollWidth<=e.clientWidth+1)"));
        assertEquals(dimensions+" buttons","true",js("Array.from(document.querySelectorAll('.tutorial-dialog button')).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight})"));
    }
    @Test public void TC150_tutorialPracticePersistenceAndLayouts() throws Exception {
        try (ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            try {
                bindActivity(null);until("document.querySelector('main')!==null");
                String run=interactionFixtures().getString("fullShop");
                js("localStorage.removeItem('jimbo:tutorial-seen:v1')");
                String settings=js("localStorage.getItem('jimbo:settings')");
                boolean first=true;
                for(String locale:new String[]{"zh-CN","en"}) for(int orientation:new int[]{ActivityInfo.SCREEN_ORIENTATION_PORTRAIT,ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE}) {
                    InstrumentationRegistry.getInstrumentation().runOnMainSync(()->currentActivity.setRequestedOrientation(orientation));
                    until(orientation==ActivityInfo.SCREEN_ORIENTATION_PORTRAIT?"innerHeight>innerWidth":"innerWidth>innerHeight");
                    js("localStorage.setItem('jimbo:run',"+JSONObject.quote(run)+");localStorage.setItem('jimbo:locale',"+JSONObject.quote(locale)+")");
                    reloadLocal(scenario);until("document.querySelector('.tutorial-entry')!==null");
                    assertEquals("true",js("document.querySelector('dialog[open]')===null"));
                    until("document.querySelector('.welcome').getAnimations().every(a=>a.playState==='finished')");
                    assertEquals(js("JSON.stringify({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight})"),"true",js("document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1"));
                    if(first)assertEquals("true",js("document.querySelector('.tutorial-entry').classList.contains('is-new')"));
                    tap(".tutorial-entry");until("document.querySelector('.tutorial-dialog[open]')!==null");
                    String saved=js("localStorage.getItem('jimbo:run')");
                    assertTutorialFits();
                    js("document.querySelector('.tutorial-next').click()");until("document.querySelector('[data-tutorial-step=\"2\"]')!==null");
                    assertTutorialFits();
                    tapTutorialCard(1,true);tapTutorialCard(2,true);
                    assertEquals("true",js("document.querySelector('.tutorial-play').disabled"));
                    tapTutorialCard(1,false);
                    assertEquals("\"false\"",js("document.querySelector('[data-tutorial-card=\"1\"]').getAttribute('aria-pressed')"));
                    tapTutorialCard(2,false);tapTutorialCard(1,true);tapTutorialCard(3,true);
                    until("!document.querySelector('.tutorial-play').disabled");
                    tap(".tutorial-play");until("document.querySelector('[data-practice-state=\"done\"]')!==null");
                    assertEquals("\"56\"",js("document.querySelector('[data-tutorial-score]').textContent"));
                    assertEquals("\"3\"",js("document.querySelector('[data-tutorial-hands]').textContent"));
                    assertEquals("true",js("document.querySelector('[data-tutorial-card=\"5\"]')!==null&&document.querySelector('[data-tutorial-card=\"6\"]')!==null"));
                    assertTutorialFits();
                    assertEquals(saved,js("localStorage.getItem('jimbo:run')"));
                    assertEquals(settings,js("localStorage.getItem('jimbo:settings')"));
                    js("document.querySelector('.tutorial-next').click()");until("document.querySelector('[data-tutorial-step=\"3\"]')!==null");
                    assertTutorialFits();
                    assertEquals(saved,js("localStorage.getItem('jimbo:run')"));
                    if(!(locale.equals("en")&&orientation==ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE)) {
                        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->currentActivity.getOnBackPressedDispatcher().onBackPressed());
                        until("document.querySelector('.tutorial-dialog')===null");
                        assertEquals("true",js("document.querySelector('main').dataset.phase==='ready'&&!document.querySelector('.tutorial-entry').classList.contains('is-new')"));
                        assertEquals(saved,js("localStorage.getItem('jimbo:run')"));
                    }
                    first=false;
                }
                js("document.querySelector('.tutorial-finish').click()");until("document.querySelector('.shop')!==null");
                assertEquals("6",js("document.querySelectorAll('.joker-card').length"));
                assertEquals(JSONObject.quote(run),js("localStorage.getItem('jimbo:run')"));
                clickText("Main menu");until("document.querySelector('dialog[open]')!==null");
                js("Array.from(document.querySelectorAll('dialog button')).find(b=>b.textContent.trim()==='Main menu').click()");
                until("document.querySelector('main').dataset.phase==='ready'");
                js("localStorage.removeItem('jimbo:run')");reloadLocal(scenario);
                tap(".tutorial-entry");until("document.querySelector('.tutorial-dialog[open]')!==null");
                js("document.querySelector('.tutorial-skip').click()");until("document.querySelector('.tutorial-dialog')===null");
                assertEquals("null",js("localStorage.getItem('jimbo:run')"));
                tap(".tutorial-entry");until("document.querySelector('.tutorial-dialog[open]')!==null");
                js("document.querySelector('.tutorial-next').click()");until("document.querySelector('[data-tutorial-step=\"2\"]')!==null");
                js("document.querySelector('.tutorial-next').click()");until("document.querySelector('[data-tutorial-step=\"3\"]')!==null");
                js("document.querySelector('.tutorial-finish').click()");until("document.querySelector('main').dataset.phase==='playing'");
                assertEquals("true",js("(()=>{const s=JSON.parse(localStorage.getItem('jimbo:run')).state;return s.round===1&&s.score===0&&s.jokers.length===0&&s.hand.length===8})()"));
            } finally {InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.loadUrl("about:blank"));}
        }
    }

    private JSONObject growthFixture() throws Exception {
        try(java.io.InputStream input=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("growth-run.json")) {
            return new JSONObject(new String(input.readAllBytes(),StandardCharsets.UTF_8));
        }
    }
    private void discardGrowthCard(int id) throws Exception {
        js("document.querySelector('.hand-row [data-motion-id=\""+id+"\"]').click()");
        until("document.querySelectorAll('.hand-row [aria-pressed=true]').length===1");
        js("document.querySelector('.controls>.coral').click()");
    }
    @Test public void TC156_growthGainLossAndReplayGuards() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)) {
            try {
                bindActivity(null);until("document.querySelector('main')!==null");
                JSONObject fixture=growthFixture();int first=fixture.getJSONArray("hearts").getInt(0),second=fixture.getJSONArray("hearts").getInt(1);
                loadInteractionRun(scenario,fixture.getString("run"),"normal");
                until("Array.from(document.querySelectorAll('.joker-card>.joker-art')).every(e=>e.getAnimations().every(a=>a.playState==='finished'))");
                String rack=js("document.querySelector('.joker-rack').innerText");
                String acquired=js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.animationName==='joker-acquire')?.startTime");
                discardGrowthCard(first);
                until("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().some(a=>a.id.startsWith('joker-growth-gain'))&&document.querySelector('[data-joker-id=\"1001\"]>.joker-art').getAnimations().some(a=>a.id.startsWith('joker-growth-loss'))");
                assertEquals("2",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                assertEquals(rack,js("document.querySelector('.joker-rack').innerText"));
                assertEquals("540",js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.id.startsWith('joker-growth')).effect.getTiming().duration"));
                assertEquals("440",js("document.querySelector('[data-joker-id=\"1001\"]>.joker-art').getAnimations().find(a=>a.id.startsWith('joker-growth')).effect.getTiming().duration"));
                String firstAnimation=js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.id.startsWith('joker-growth')).id");
                js("window.growthVisualFrames=document.getAnimations().filter(a=>a.id.startsWith('joker-growth'));growthVisualFrames.forEach(a=>{a.pause();a.currentTime=a.effect.getTiming().duration*.2})");
                CountDownLatch rendered=new CountDownLatch(1);
                InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.postVisualStateCallback(0,new WebView.VisualStateCallback(){@Override public void onComplete(long id){web.postOnAnimation(()->web.postOnAnimation(rendered::countDown));}}));
                assertTrue("Growth frame rendered",rendered.await(3,TimeUnit.SECONDS));
                android.graphics.Bitmap shot=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
                java.io.File file=new java.io.File(InstrumentationRegistry.getInstrumentation().getTargetContext().getExternalFilesDir(null),"growth-gain-loss.png");
                try(java.io.FileOutputStream output=new java.io.FileOutputStream(file)){shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,output);}shot.recycle();
                js("growthVisualFrames.forEach(a=>a.play())");
                until("document.querySelector('main').dataset.motionStage==='idle'");
                assertEquals("0",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                assertEquals(acquired,js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.animationName==='joker-acquire')?.startTime"));
                assertEquals("true",js("(()=>{const j=JSON.parse(localStorage.getItem('jimbo:run')).state.jokers;return j.find(j=>j.id===1000).value===24&&j.find(j=>j.id===1001).value===0})()"));
                discardGrowthCard(second);
                until("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().some(a=>a.id.startsWith('joker-growth-gain'))");
                assertEquals("1",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                assertNotEquals(firstAnimation,js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.id.startsWith('joker-growth')).id"));
                until("document.querySelector('main').dataset.motionStage==='idle'");
                reloadLocal(scenario);clickText("Continue");until("document.querySelectorAll('.joker-card').length===6");
                assertEquals("0",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                tap(".joker-card:first-child");until("document.querySelector('dialog[open]')!==null");clickText("Move right");
                assertEquals("0",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                js("document.querySelector('dialog .icon-button').click()");
                loadInteractionRun(scenario,fixture.getString("run"),"normal");
                org.json.JSONArray four=fixture.getJSONArray("four");
                for(int i=0;i<four.length();i++) {js("document.querySelector('.hand-row [data-motion-id=\""+four.getInt(i)+"\"]').click()");until("document.querySelectorAll('.hand-row [aria-pressed=true]').length==="+(i+1));}
                js("document.querySelector('.play-button').click()");
                until("document.querySelectorAll('.joker-card[data-growth=gain]').length===3");
                assertEquals("true",js("[1001,1002,1003].every(id=>document.querySelector('[data-joker-id=\"'+id+'\"]').dataset.growth==='gain')"));
                until("document.querySelector('.joker-card.joker-trigger')!==null");
                until("document.querySelector('main').dataset.motionStage==='idle'");
                loadInteractionRun(scenario,fixture.getString("run"),"fast");
                discardGrowthCard(first);
                until("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().some(a=>a.id.startsWith('joker-growth-gain'))");
                assertEquals("243",js("document.querySelector('[data-joker-id=\"1000\"]>.joker-art').getAnimations().find(a=>a.id.startsWith('joker-growth')).effect.getTiming().duration"));
                until("document.querySelector('main').dataset.motionStage==='idle'");
                loadInteractionRun(scenario,fixture.getString("run"),"instant");
                discardGrowthCard(first);
                until("JSON.parse(localStorage.getItem('jimbo:run')).state.discards===3");
                assertEquals("0",js("document.querySelectorAll('.joker-card[data-growth]').length"));
                assertEquals("true",js("Array.from(document.querySelectorAll('.joker-card>.joker-art')).every(e=>e.getAnimations().every(a=>!a.id.startsWith('joker-growth')))"));
            } finally {InstrumentationRegistry.getInstrumentation().runOnMainSync(()->web.loadUrl("about:blank"));}
        }
    }

}
