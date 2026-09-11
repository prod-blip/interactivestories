package com.moonlitstories.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.Consumer;

@CapacitorPlugin(name = "MoonlitBilling")
public class MoonlitBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String PRODUCT_ID = "premium_story_pack_1";
    private static final String PREFS_NAME = "moonlit_billing";
    private static final String PREF_PREMIUM_OWNED = "premium_story_pack_owned";

    private BillingClient billingClient;
    private SharedPreferences preferences;
    private ProductDetails premiumProductDetails;
    private PluginCall pendingPurchaseCall;
    private boolean connecting;
    private final List<Runnable> readyActions = new ArrayList<>();
    private final List<Consumer<BillingResult>> failedActions = new ArrayList<>();

    @Override
    public void load() {
        preferences = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .enableAutoServiceReconnection()
            .build();

        ensureConnected(
            () -> refreshPurchases(null, false, false),
            ignored -> notifyEntitlementChanged(cachedOwned(), false, false)
        );
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        ensureConnected(
            () -> refreshPurchases(call, true, false),
            result -> call.resolve(statusResult(
                cachedOwned(),
                false,
                false,
                null,
                null
            ))
        );
    }

    @PluginMethod
    public void restorePurchases(PluginCall call) {
        ensureConnected(
            () -> refreshPurchases(call, true, true),
            result -> call.reject(
                "Google Play could not be reached. Try again when you are online.",
                "BILLING_UNAVAILABLE"
            )
        );
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        if (pendingPurchaseCall != null) {
            call.reject("Another purchase is already in progress.", "PURCHASE_IN_PROGRESS");
            return;
        }

        ensureConnected(
            () -> queryPremiumProduct(call),
            result -> call.reject(
                "Google Play purchases are currently unavailable.",
                "BILLING_UNAVAILABLE"
            )
        );
    }

    private void queryPremiumProduct(PluginCall call) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (result, detailsResult) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject("The story collection could not be loaded from Google Play.", "PRODUCT_QUERY_FAILED");
                return;
            }

            List<ProductDetails> products = detailsResult.getProductDetailsList();
            if (products.isEmpty()) {
                call.reject(
                    "This story collection is not available yet. Check its Play Console product setup.",
                    "PRODUCT_NOT_FOUND"
                );
                return;
            }

            premiumProductDetails = products.get(0);
            launchPurchaseFlow(call, premiumProductDetails);
        });
    }

    private void launchPurchaseFlow(PluginCall call, ProductDetails details) {
        BillingFlowParams.ProductDetailsParams.Builder productParams =
            BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);

        List<ProductDetails.OneTimePurchaseOfferDetails> offers =
            details.getOneTimePurchaseOfferDetailsList();
        if (offers != null && !offers.isEmpty()) {
            productParams.setOfferToken(offers.get(0).getOfferToken());
        }

        BillingFlowParams flowParams = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(Collections.singletonList(productParams.build()))
            .build();

        pendingPurchaseCall = call;
        BillingResult launchResult = billingClient.launchBillingFlow(getActivity(), flowParams);
        if (launchResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
            pendingPurchaseCall = null;
            call.reject("Google Play could not start the purchase.", "PURCHASE_LAUNCH_FAILED");
        }
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;

        if (result.getResponseCode() == BillingClient.BillingResponseCode.USER_CANCELED) {
            if (call != null) {
                JSObject response = statusResult(cachedOwned(), false, true, formattedPrice(), null);
                call.resolve(response);
            }
            return;
        }

        if (result.getResponseCode() == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            refreshPurchases(call, true, true);
            return;
        }

        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
            if (call != null) {
                call.reject("The purchase could not be completed.", "PURCHASE_FAILED");
            }
            return;
        }

        PurchaseState state = processPurchases(purchases);
        if (call != null) {
            call.resolve(statusResult(state.owned, state.pending, false, formattedPrice(), null));
        }
    }

    private void refreshPurchases(
        PluginCall call,
        boolean includeProductDetails,
        boolean rejectOnFailure
    ) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build();

        billingClient.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                if (call != null) {
                    if (rejectOnFailure) {
                        call.reject(
                            "Google Play could not check your purchases. Try again when you are online.",
                            "PURCHASE_QUERY_FAILED"
                        );
                    } else {
                        call.resolve(statusResult(
                            cachedOwned(),
                            false,
                            false,
                            formattedPrice(),
                            null
                        ));
                    }
                }
                return;
            }

            PurchaseState state = processPurchases(purchases);
            if (!includeProductDetails || call == null) return;
            queryProductForStatus(call, state);
        });
    }

    private void queryProductForStatus(PluginCall call, PurchaseState state) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (result, detailsResult) -> {
            boolean available = false;
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK &&
                !detailsResult.getProductDetailsList().isEmpty()) {
                premiumProductDetails = detailsResult.getProductDetailsList().get(0);
                available = true;
            } else {
                premiumProductDetails = null;
            }
            JSObject response = statusResult(
                state.owned,
                state.pending,
                false,
                available ? formattedPrice() : null,
                null
            );
            response.put("available", available);
            call.resolve(response);
        });
    }

    private PurchaseState processPurchases(List<Purchase> purchases) {
        boolean owned = false;
        boolean pending = false;

        for (Purchase purchase : purchases) {
            if (!purchase.getProducts().contains(PRODUCT_ID)) continue;
            if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                owned = true;
                acknowledgeIfNeeded(purchase);
            } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                pending = true;
            }
        }

        preferences.edit().putBoolean(PREF_PREMIUM_OWNED, owned).apply();
        notifyEntitlementChanged(owned, pending, true);
        return new PurchaseState(owned, pending);
    }

    private void acknowledgeIfNeeded(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        AcknowledgePurchaseParams params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();
        billingClient.acknowledgePurchase(params, ignored -> {
            // Ownership was already granted. A later refresh will retry if
            // acknowledgement did not reach Google Play.
        });
    }

    private void ensureConnected(Runnable onReady, Consumer<BillingResult> onFailure) {
        getActivity().runOnUiThread(() -> {
            if (billingClient.isReady()) {
                onReady.run();
                return;
            }

            readyActions.add(onReady);
            failedActions.add(onFailure);
            if (connecting) return;
            connecting = true;

            billingClient.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult result) {
                    connecting = false;
                    List<Runnable> ready = new ArrayList<>(readyActions);
                    List<Consumer<BillingResult>> failed = new ArrayList<>(failedActions);
                    readyActions.clear();
                    failedActions.clear();

                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        ready.forEach(Runnable::run);
                    } else {
                        failed.forEach(action -> action.accept(result));
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    connecting = false;
                }
            });
        });
    }

    private String formattedPrice() {
        if (premiumProductDetails == null) return null;
        List<ProductDetails.OneTimePurchaseOfferDetails> offers =
            premiumProductDetails.getOneTimePurchaseOfferDetailsList();
        if (offers == null || offers.isEmpty()) return null;
        return offers.get(0).getFormattedPrice();
    }

    private boolean cachedOwned() {
        return preferences.getBoolean(PREF_PREMIUM_OWNED, false);
    }

    private JSObject statusResult(
        boolean owned,
        boolean pending,
        boolean cancelled,
        String price,
        String message
    ) {
        JSObject result = new JSObject();
        result.put("productId", PRODUCT_ID);
        result.put("owned", owned);
        result.put("pending", pending);
        result.put("cancelled", cancelled);
        result.put("available", premiumProductDetails != null);
        if (price != null) result.put("price", price);
        if (message != null && !message.isBlank()) result.put("message", message);
        return result;
    }

    private void notifyEntitlementChanged(boolean owned, boolean pending, boolean available) {
        JSObject result = statusResult(owned, pending, false, formattedPrice(), null);
        result.put("available", available && premiumProductDetails != null);
        notifyListeners("entitlementChanged", result, false);
    }

    @Override
    protected void handleOnResume() {
        if (billingClient == null) return;
        ensureConnected(
            () -> refreshPurchases(null, false, false),
            ignored -> notifyEntitlementChanged(cachedOwned(), false, false)
        );
    }

    @Override
    protected void handleOnDestroy() {
        if (billingClient != null) billingClient.endConnection();
    }

    private static final class PurchaseState {
        final boolean owned;
        final boolean pending;

        PurchaseState(boolean owned, boolean pending) {
            this.owned = owned;
            this.pending = pending;
        }
    }
}
