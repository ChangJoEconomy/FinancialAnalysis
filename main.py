import pandas as pd
import json
from pykrx import stock

def get_korean_stocks():
    """
    pykrx 라이브러리를 사용하여 KOSPI 및 KOSDAQ 모든 종목의
    종목 코드와 이름을 가져옵니다.
    """
    all_stocks = []
    markets = ["KOSPI", "KOSDAQ"]
    
    for market in markets:
        tickers = stock.get_market_ticker_list(market=market)
        for ticker in tickers:
            company_name = stock.get_market_ticker_name(ticker)
            all_stocks.append({
                "market": market,
                "ticker": ticker,
                "name": company_name
            })
            
    return all_stocks

def main():
    """
    KOSPI/KOSDAQ 종목 정보를 통합하여 JSON 파일로 저장합니다.
    """
    print("KOSPI/KOSDAQ 종목 정보를 가져오는 중입니다...")
    korean_stocks = get_korean_stocks()
    
    # 데이터를 JSON 파일로 저장합니다.
    with open('korean_stocks.json', 'w', encoding='utf-8') as f:
        json.dump(korean_stocks, f, ensure_ascii=False, indent=4)
        
    print(f"\n총 {len(korean_stocks)}개의 종목 정보를 'korean_stocks.json' 파일로 저장했습니다.")

if __name__ == "__main__":
    try:
        import pykrx
        import pandas
    except ImportError:
        print("필요한 라이브러리를 설치합니다: pip install pykrx pandas")
        import os
        os.system("pip install pykrx pandas")

    main()
