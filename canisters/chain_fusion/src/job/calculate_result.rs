use candid::Principal;

use crate::xrc::{
    Asset, AssetClass, ExchangeRate, GetExchangeRateRequest, GetExchangeRateResult, Service,
};

pub async fn get_exchange_rate() -> ExchangeRate {
    let xrc = Service(
        Principal::from_text("uf6dk-hyaaa-aaaaq-qaaaq-cai").expect("principal should be encodable"),
    );

    let cycles = 1_000_000_000;

    let request = GetExchangeRateRequest {
        timestamp: None,
        base_asset: Asset {
            class: AssetClass::Cryptocurrency,
            symbol: "WIF".to_string(),
        },
        quote_asset: Asset {
            class: AssetClass::FiatCurrency,
            symbol: "USD".to_string(),
        },
    };

    match xrc.get_exchange_rate(request, cycles).await {
        Ok((exchange_rate_result,)) => match exchange_rate_result {
            GetExchangeRateResult::Ok(exchange_rate) => exchange_rate,
            GetExchangeRateResult::Err(_e) => {
                ic_cdk::trap("An error occured fetching the exchange rate")
            }
        },
        Err(e) => ic_cdk::trap(format!("Error: {:?}", e).as_str()),
    }
}
