use crate::job::calculate_result::get_exchange_rate;
use crate::state::{mutate_state, read_state};
use ic_cdk_timers::set_timer_interval;
use std::time::Duration;

const UPDATE_INTERVAL: Duration = Duration::from_secs(60);

pub fn setup_price_feed_timer() {
    set_timer_interval(UPDATE_INTERVAL, || {
        ic_cdk::spawn(update_price_feed())
    });
}

async fn update_price_feed() {
    let exchange_rate = get_exchange_rate().await;
    let price = (exchange_rate.rate as f64) / 10f64.powi(exchange_rate.metadata.decimals as i32);
    
    mutate_state(|s| {
        s.latest_price = Some(price);
    });

    ic_cdk::println!("Đã cập nhật giá: {:.6}", price);
}

pub fn get_latest_price() -> Option<f64> {
    read_state(|s| s.latest_price)
}