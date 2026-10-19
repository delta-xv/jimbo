package com.jimbo.game;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView webView = getBridge().getWebView();
        webView.setOnLongClickListener(view -> {
            WebView.HitTestResult hit = webView.getHitTestResult();
            return hit == null || hit.getType() != WebView.HitTestResult.EDIT_TEXT_TYPE;
        });
    }
}
