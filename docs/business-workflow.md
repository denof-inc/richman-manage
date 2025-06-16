# 業務フロー図 - RichmanManage

## 1. 全体業務フロー

```mermaid
graph TB
    Start([不動産投資業務開始])
    
    %% 日次業務
    Daily[日次業務]
    DashCheck[ダッシュボード確認]
    Alert[アラート確認]
    
    %% 月次業務
    Monthly[月次業務]
    RentCollection[家賃入金確認]
    PaymentExec[支払実行]
    MonthlyReport[月次レポート作成]
    
    %% 年次業務
    Yearly[年次業務]
    TaxPayment[固定資産税納付]
    YearlyReport[年次収支確認]
    TaxReturn[確定申告準備]
    
    %% フロー接続
    Start --> Daily
    Start --> Monthly
    Start --> Yearly
    
    Daily --> DashCheck
    DashCheck --> Alert
    
    Monthly --> RentCollection
    RentCollection --> PaymentExec
    PaymentExec --> MonthlyReport
    
    Yearly --> TaxPayment
    TaxPayment --> YearlyReport
    YearlyReport --> TaxReturn
```

## 2. 月次業務フロー詳細

```mermaid
graph LR
    Start([月初])
    
    %% 収入確認フェーズ
    subgraph 収入確認
        CheckRent[レントロール確認]
        UpdateStatus[入居状況更新]
        RecordIncome[入金記録]
    end
    
    %% 支出処理フェーズ
    subgraph 支出処理
        LoanPayment[ローン返済]
        ExpenseInput[経費入力]
        TaxReserve[税金積立]
    end
    
    %% レポート作成フェーズ
    subgraph レポート作成
        CalcCF[CF計算]
        CreatePDF[PDF生成]
        BankSubmit[銀行提出]
    end
    
    End([月末])
    
    %% フロー
    Start --> CheckRent
    CheckRent --> UpdateStatus
    UpdateStatus --> RecordIncome
    RecordIncome --> LoanPayment
    LoanPayment --> ExpenseInput
    ExpenseInput --> TaxReserve
    TaxReserve --> CalcCF
    CalcCF --> CreatePDF
    CreatePDF --> BankSubmit
    BankSubmit --> End
```

## 3. 物件取得フロー

```mermaid
graph TD
    Start([物件取得決定])
    
    %% 物件登録
    PropReg[物件基本情報登録]
    UnitReg[部屋情報登録]
    
    %% ローン登録
    LoanCheck{ローン利用?}
    LoanReg[借入情報登録]
    
    %% 初期設定
    TaxReg[固定資産税設定]
    InitCalc[初期収支計算]
    
    End([運用開始])
    
    %% フロー
    Start --> PropReg
    PropReg --> UnitReg
    UnitReg --> LoanCheck
    LoanCheck -->|Yes| LoanReg
    LoanCheck -->|No| TaxReg
    LoanReg --> TaxReg
    TaxReg --> InitCalc
    InitCalc --> End
```

## 4. 入退去管理フロー

```mermaid
graph LR
    %% 退去フロー
    subgraph 退去処理
        Notice[退去通知受領]
        MoveOut[退去日登録]
        Refund[敷金精算]
        Vacant[空室化]
    end
    
    %% 募集フロー
    subgraph 募集活動
        List[募集開始]
        Show[内見対応]
        Screen[入居審査]
    end
    
    %% 入居フロー
    subgraph 入居処理
        Contract[契約締結]
        MoveIn[入居登録]
        Deposit[敷金受領]
        Occupied[入居中]
    end
    
    %% フロー
    Notice --> MoveOut
    MoveOut --> Refund
    Refund --> Vacant
    Vacant --> List
    List --> Show
    Show --> Screen
    Screen --> Contract
    Contract --> MoveIn
    MoveIn --> Deposit
    Deposit --> Occupied
```

## 5. 固定資産税管理フロー

```mermaid
graph TD
    Start([年初])
    
    %% 設定フェーズ
    TaxNotice[納税通知書受領]
    TaxReg[税額登録]
    Schedule[納付スケジュール生成]
    
    %% 納付フェーズ（4回繰り返し）
    subgraph 四半期納付
        Alert[納期限アラート]
        Payment[納付実行]
        Record[支出記録]
        Status[ステータス更新]
    end
    
    %% 年度末処理
    YearEnd[年度集計]
    NextYear[翌年度準備]
    
    End([年度末])
    
    %% フロー
    Start --> TaxNotice
    TaxNotice --> TaxReg
    TaxReg --> Schedule
    Schedule --> Alert
    Alert --> Payment
    Payment --> Record
    Record --> Status
    Status --> Alert
    Status --> YearEnd
    YearEnd --> NextYear
    NextYear --> End
```

## 6. キャッシュフロー分析フロー

```mermaid
graph TB
    Start([分析開始])
    
    %% データ収集
    subgraph データ収集
        RentData[家賃データ]
        LoanData[返済データ]
        ExpenseData[経費データ]
        TaxData[税金データ]
    end
    
    %% 計算処理
    subgraph 計算処理
        Income[収入集計]
        Expense[支出集計]
        NetCF[純CF算出]
    end
    
    %% 可視化
    subgraph 可視化
        Monthly[月次推移]
        Yearly[年次推移]
        Compare[前年比較]
    end
    
    %% 出力
    Report[レポート生成]
    Decision[経営判断]
    
    End([分析完了])
    
    %% フロー
    Start --> RentData
    Start --> LoanData
    Start --> ExpenseData
    Start --> TaxData
    
    RentData --> Income
    LoanData --> Expense
    ExpenseData --> Expense
    TaxData --> Expense
    
    Income --> NetCF
    Expense --> NetCF
    
    NetCF --> Monthly
    NetCF --> Yearly
    NetCF --> Compare
    
    Monthly --> Report
    Yearly --> Report
    Compare --> Report
    
    Report --> Decision
    Decision --> End
```

## 7. システム利用の典型的な1日

```mermaid
sequenceDiagram
    participant User as 投資家
    participant App as RichmanManage
    participant Bank as 銀行
    participant Tenant as 入居者
    
    %% 朝のルーティン
    User->>App: ログイン
    App->>User: ダッシュボード表示
    App->>User: 本日の予定通知
    
    %% 入金確認
    Tenant->>Bank: 家賃振込
    Bank->>User: 入金通知
    User->>App: 入金記録
    
    %% 支払処理
    User->>App: 支払予定確認
    User->>Bank: ローン返済実行
    User->>App: 支払記録
    
    %% レポート確認
    User->>App: 月次CF確認
    App->>User: グラフ表示
    
    %% 夜の確認
    User->>App: 明日の予定確認
    App->>User: リマインダー表示
```

## 8. 例外処理フロー

### 8.1 家賃滞納対応

```mermaid
graph TD
    Start([家賃滞納発生])
    
    Detection[システム検知]
    Alert[アラート通知]
    Contact[入居者連絡]
    
    Response{入金確認?}
    Paid[入金記録]
    
    Escalate[督促強化]
    Legal[法的措置検討]
    
    End([解決])
    
    Start --> Detection
    Detection --> Alert
    Alert --> Contact
    Contact --> Response
    Response -->|Yes| Paid
    Response -->|No| Escalate
    Paid --> End
    Escalate --> Legal
    Legal --> End
```

### 8.2 緊急修繕対応

```mermaid
graph LR
    Start([修繕必要発生])
    
    Report[報告受付]
    Assess[状況確認]
    
    Priority{緊急度?}
    Urgent[即日対応]
    Normal[通常対応]
    
    Vendor[業者手配]
    Execute[修繕実施]
    Record[費用記録]
    
    End([完了])
    
    Start --> Report
    Report --> Assess
    Assess --> Priority
    Priority -->|高| Urgent
    Priority -->|低| Normal
    Urgent --> Vendor
    Normal --> Vendor
    Vendor --> Execute
    Execute --> Record
    Record --> End
```

## 9. データフロー図

```mermaid
graph TB
    %% 外部データソース
    subgraph 外部
        Bank[銀行API]
        Tax[税務署]
        Utility[管理会社]
    end
    
    %% システム内部
    subgraph RichmanManage
        %% データ層
        DB[(データベース)]
        
        %% ビジネスロジック層
        PropLogic[物件管理]
        LoanLogic[借入管理]
        RentLogic[レントロール]
        TaxLogic[税金管理]
        
        %% 集計・分析層
        Analytics[分析エンジン]
        Report[レポート生成]
    end
    
    %% UI層
    subgraph ユーザーインターフェース
        Web[Webアプリ]
        Mobile[モバイルアプリ]
        PDF[PDF出力]
    end
    
    %% データフロー
    Bank --> LoanLogic
    Tax --> TaxLogic
    Utility --> PropLogic
    
    PropLogic --> DB
    LoanLogic --> DB
    RentLogic --> DB
    TaxLogic --> DB
    
    DB --> Analytics
    Analytics --> Report
    
    Report --> Web
    Report --> Mobile
    Report --> PDF
```

## 10. 年間業務カレンダー

| 月 | 定期業務 | イベント |
|----|----------|----------|
| 1月 | 月次収支確認 | 年間計画策定 |
| 2月 | 月次収支確認 | 固定資産税4期納付、確定申告準備 |
| 3月 | 月次収支確認 | 確定申告、契約更新確認 |
| 4月 | 月次収支確認 | 新年度開始 |
| 5月 | 月次収支確認 | 固定資産税通知受領 |
| 6月 | 月次収支確認 | 固定資産税1期納付 |
| 7月 | 月次収支確認 | 上期実績確認 |
| 8月 | 月次収支確認 | 修繕計画検討 |
| 9月 | 月次収支確認 | 固定資産税2期納付、契約更新確認 |
| 10月 | 月次収支確認 | 年末調整準備 |
| 11月 | 月次収支確認 | 翌年度予算策定 |
| 12月 | 月次収支確認 | 固定資産税3期納付、年間実績確認 |

