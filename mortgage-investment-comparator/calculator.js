(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MortgageComparator = factory();
  }
})(typeof globalThis === 'object' ? globalThis : window, function () {
  'use strict';

  var defaultInput = {
    housePrice: 86000000,
    downPaymentMode: 'percentage',
    downPaymentPercentage: 20,
    downPaymentAmount: 10000000,
    mortgageAnnualRate: 2,
    rateChangeYear: 0,
    mortgageAnnualRateAfterChange: 3,
    loanTermYears: 35,
    horizonYears: 35,
    mortgageTaxCreditRate: 0.7,
    mortgageTaxCreditYears: 10,
    mortgageTaxCreditLoanCap: 20000000,
    landAnnualGrowthRate: 2,
    buildingStructure: 'rc',
    buildingAgeYears: 22,
    landSharePercentage: 50,
    purchaseFeeRate: 8,
    sellingFeeRate: 3,
    monthlyOwnerCost: 58000,
    ownerCostAnnualGrowthRate: 2,
    repairIntervalYears: 15,
    repairCost: 0,
    investmentAnnualReturnRate: 5,
    investmentTaxRate: 0,
    monthlyRent: 260000,
    rentAnnualGrowthRate: 2,
    rentAgingRate: 0.8,
    renewalIntervalYears: 2,
    renewalFeeMonths: 1,
  };

  function isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function isPositiveInteger(value) {
    return isFiniteNumber(value) && Number.isInteger(value) && value > 0;
  }

  function isValidDownPaymentMode(value) {
    return value === 'percentage' || value === 'fixed';
  }

  function isValidBuildingStructure(value) {
    return value === 'wood' || value === 'rc';
  }

  function getBuildingUsefulLifeYears(structure) {
    return structure === 'rc' ? 47 : 22;
  }

  // NTA No.5404 simplified method for used buildings: elapsed years still
  // count for 20% of their length, partial years are dropped, minimum 2 years.
  function getBuildingRemainingLifeYears(usefulLifeYears, ageYears) {
    var estimatedYears =
      ageYears >= usefulLifeYears
        ? usefulLifeYears / 5
        : usefulLifeYears - ageYears + ageYears / 5;
    return Math.max(2, Math.floor(estimatedYears));
  }

  function validateSimulationInput(input) {
    var errors = {};
    var housePriceIsValid =
      isFiniteNumber(input.housePrice) && input.housePrice > 0;

    if (!housePriceIsValid) {
      errors.housePrice = '房屋价格必须大于 0。';
    } else if (input.housePrice > 100000000) {
      errors.housePrice = '房屋价格不能超过 1 亿。';
    }

    if (!isValidDownPaymentMode(input.downPaymentMode)) {
      errors.downPaymentMode = '请选择有效的头金方式。';
    } else if (input.downPaymentMode === 'percentage') {
      if (
        !isFiniteNumber(input.downPaymentPercentage) ||
        input.downPaymentPercentage < 0 ||
        input.downPaymentPercentage > 50
      ) {
        errors.downPaymentPercentage = '头金比例必须在 0% 到 50% 之间。';
      }
    } else if (
      !isFiniteNumber(input.downPaymentAmount) ||
      input.downPaymentAmount < 0
    ) {
      errors.downPaymentAmount = '头金金额不能为负数。';
    }

    if (housePriceIsValid) {
      var downPayment =
        input.downPaymentMode === 'percentage'
          ? (input.housePrice * input.downPaymentPercentage) / 100
          : input.downPaymentAmount;
      if (
        isFiniteNumber(downPayment) &&
        downPayment > input.housePrice &&
        !errors.downPaymentPercentage &&
        !errors.downPaymentAmount
      ) {
        var downPaymentField =
          input.downPaymentMode === 'percentage'
            ? 'downPaymentPercentage'
            : 'downPaymentAmount';
        errors[downPaymentField] = '头金不能高于房屋价格。';
      }
    }

    if (
      !isFiniteNumber(input.mortgageAnnualRate) ||
      input.mortgageAnnualRate < 0 ||
      input.mortgageAnnualRate > 10
    ) {
      errors.mortgageAnnualRate = '房贷年利率必须在 0% 到 10% 之间。';
    }

    if (!isPositiveInteger(input.loanTermYears)) {
      errors.loanTermYears = '贷款期限必须是正整数。';
    }

    if (
      !isFiniteNumber(input.rateChangeYear) ||
      !Number.isInteger(input.rateChangeYear) ||
      input.rateChangeYear < 0
    ) {
      errors.rateChangeYear = '利率变动年份必须是 0 或正整数。';
    } else if (
      input.rateChangeYear > 0 &&
      isPositiveInteger(input.loanTermYears) &&
      input.rateChangeYear >= input.loanTermYears
    ) {
      errors.rateChangeYear = '利率变动年份必须小于贷款期限。';
    }

    if (
      !isFiniteNumber(input.mortgageAnnualRateAfterChange) ||
      input.mortgageAnnualRateAfterChange < 0 ||
      input.mortgageAnnualRateAfterChange > 10
    ) {
      errors.mortgageAnnualRateAfterChange = '变动后利率必须在 0% 到 10% 之间。';
    }

    if (!isPositiveInteger(input.horizonYears)) {
      errors.horizonYears = '模拟期限必须是正整数。';
    } else if (
      isPositiveInteger(input.loanTermYears) &&
      input.horizonYears > input.loanTermYears
    ) {
      errors.horizonYears = '模拟期限不能超过贷款期限。';
    }

    if (
      !isFiniteNumber(input.mortgageTaxCreditRate) ||
      input.mortgageTaxCreditRate < 0 ||
      input.mortgageTaxCreditRate > 1
    ) {
      errors.mortgageTaxCreditRate = '住宅ローン控除率必须在 0% 到 1% 之间。';
    }

    if (
      !isFiniteNumber(input.mortgageTaxCreditYears) ||
      !Number.isInteger(input.mortgageTaxCreditYears) ||
      input.mortgageTaxCreditYears < 0 ||
      input.mortgageTaxCreditYears > 13
    ) {
      errors.mortgageTaxCreditYears = '控除期间必须是 0 到 13 年的整数。';
    }

    if (
      !isFiniteNumber(input.mortgageTaxCreditLoanCap) ||
      input.mortgageTaxCreditLoanCap < 0 ||
      input.mortgageTaxCreditLoanCap > 50000000
    ) {
      errors.mortgageTaxCreditLoanCap =
        '控除对象借入限度额必须在 0 到 50,000,000 之间。';
    }

    if (
      !isFiniteNumber(input.landAnnualGrowthRate) ||
      input.landAnnualGrowthRate < -20 ||
      input.landAnnualGrowthRate > 20
    ) {
      errors.landAnnualGrowthRate = '土地年增长率必须在 -20% 到 20% 之间。';
    }

    if (!isValidBuildingStructure(input.buildingStructure)) {
      errors.buildingStructure = '请选择有效的建筑物结构。';
    }

    if (
      !isFiniteNumber(input.buildingAgeYears) ||
      !Number.isInteger(input.buildingAgeYears) ||
      input.buildingAgeYears < 0 ||
      input.buildingAgeYears > 60
    ) {
      errors.buildingAgeYears = '购买时建筑年龄必须是 0 到 60 年的整数。';
    }

    if (
      !isFiniteNumber(input.landSharePercentage) ||
      input.landSharePercentage < 0 ||
      input.landSharePercentage > 100
    ) {
      errors.landSharePercentage = '土地占比必须在 0% 到 100% 之间。';
    }

    if (
      !isFiniteNumber(input.purchaseFeeRate) ||
      input.purchaseFeeRate < 0 ||
      input.purchaseFeeRate > 100
    ) {
      errors.purchaseFeeRate = '购房费用比例必须在 0% 到 100% 之间。';
    }

    if (
      !isFiniteNumber(input.sellingFeeRate) ||
      input.sellingFeeRate < 0 ||
      input.sellingFeeRate > 100
    ) {
      errors.sellingFeeRate = '出售费用比例必须在 0% 到 100% 之间。';
    }

    if (
      !isFiniteNumber(input.monthlyOwnerCost) ||
      input.monthlyOwnerCost < 0 ||
      input.monthlyOwnerCost > 200000
    ) {
      errors.monthlyOwnerCost = '每月持有成本必须在 0 到 200,000 之间。';
    }

    if (
      !isFiniteNumber(input.ownerCostAnnualGrowthRate) ||
      input.ownerCostAnnualGrowthRate < -10 ||
      input.ownerCostAnnualGrowthRate > 10
    ) {
      errors.ownerCostAnnualGrowthRate =
        '持有成本年增长率必须在 -10% 到 10% 之间。';
    }

    if (
      !isFiniteNumber(input.repairIntervalYears) ||
      !Number.isInteger(input.repairIntervalYears) ||
      input.repairIntervalYears < 5 ||
      input.repairIntervalYears > 30
    ) {
      errors.repairIntervalYears = '大修周期必须是 5 到 30 年的整数。';
    }

    if (
      !isFiniteNumber(input.repairCost) ||
      input.repairCost < 0 ||
      input.repairCost > 10000000
    ) {
      errors.repairCost = '每次大修费用必须在 0 到 10,000,000 之间。';
    }

    if (
      !isFiniteNumber(input.monthlyRent) ||
      input.monthlyRent < 0 ||
      input.monthlyRent > 500000
    ) {
      errors.monthlyRent = '当前月租必须在 0 到 500,000 之间。';
    }

    if (
      !isFiniteNumber(input.rentAnnualGrowthRate) ||
      input.rentAnnualGrowthRate < -10 ||
      input.rentAnnualGrowthRate > 10
    ) {
      errors.rentAnnualGrowthRate = '年租金增长率必须在 -10% 到 10% 之间。';
    }

    if (
      !isFiniteNumber(input.rentAgingRate) ||
      input.rentAgingRate < 0 ||
      input.rentAgingRate > 5
    ) {
      errors.rentAgingRate = '房龄租金折价必须在 0% 到 5% 之间。';
    }

    if (
      !isFiniteNumber(input.renewalIntervalYears) ||
      !Number.isInteger(input.renewalIntervalYears) ||
      input.renewalIntervalYears < 1 ||
      input.renewalIntervalYears > 5
    ) {
      errors.renewalIntervalYears = '更新周期必须是 1 到 5 年的整数。';
    }

    if (
      !isFiniteNumber(input.renewalFeeMonths) ||
      input.renewalFeeMonths < 0 ||
      input.renewalFeeMonths > 3
    ) {
      errors.renewalFeeMonths = '更新料必须在 0 到 3 个月房租之间。';
    }

    if (
      !isFiniteNumber(input.investmentAnnualReturnRate) ||
      input.investmentAnnualReturnRate < -20 ||
      input.investmentAnnualReturnRate > 20
    ) {
      errors.investmentAnnualReturnRate = '年化投资收益率必须在 -20% 到 20% 之间。';
    }

    if (
      !isFiniteNumber(input.investmentTaxRate) ||
      input.investmentTaxRate < 0 ||
      input.investmentTaxRate > 20.315
    ) {
      errors.investmentTaxRate = '投资收益税率必须在 0% 到 20.315% 之间。';
    }

    return errors;
  }

  function SimulationInputError(errors) {
    this.name = 'SimulationInputError';
    this.message = 'Invalid simulation input';
    this.errors = errors;
  }
  SimulationInputError.prototype = Object.create(Error.prototype);
  SimulationInputError.prototype.constructor = SimulationInputError;

  function resolveDownPayment(input) {
    return input.downPaymentMode === 'percentage'
      ? (input.housePrice * input.downPaymentPercentage) / 100
      : input.downPaymentAmount;
  }

  function calculateMonthlyPayment(loanPrincipal, annualRate, totalMonths) {
    if (!isFiniteNumber(loanPrincipal) || loanPrincipal <= 0) {
      return 0;
    }
    if (!isPositiveInteger(totalMonths)) {
      throw new RangeError('totalMonths must be a positive integer');
    }

    var monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) {
      return loanPrincipal / totalMonths;
    }

    var growthFactor = Math.pow(1 + monthlyRate, totalMonths);
    return (
      (loanPrincipal * monthlyRate * growthFactor) / (growthFactor - 1)
    );
  }

  // Liquidation value: only the gain above the contributed cost basis is taxed.
  function calculateAfterTaxValue(balance, costBasis, taxRate) {
    return balance - (Math.max(0, balance - costBasis) * taxRate) / 100;
  }

  function simulate(input) {
    var errors = validateSimulationInput(input);
    if (Object.keys(errors).length > 0) {
      throw new SimulationInputError(errors);
    }

    var totalLoanMonths = input.loanTermYears * 12;
    var totalSimulationMonths = input.horizonYears * 12;
    var renewalIntervalMonths = input.renewalIntervalYears * 12;
    var initialDownPayment = resolveDownPayment(input);
    var loanPrincipal = input.housePrice - initialDownPayment;
    var buildingUsefulLifeYears = getBuildingUsefulLifeYears(
      input.buildingStructure,
    );
    var buildingRemainingLifeYears = getBuildingRemainingLifeYears(
      buildingUsefulLifeYears,
      input.buildingAgeYears,
    );
    var initialLandValue =
      (input.housePrice * input.landSharePercentage) / 100;
    var initialBuildingValue = input.housePrice - initialLandValue;
    var purchaseFees = (input.housePrice * input.purchaseFeeRate) / 100;
    var initialExpenses = initialDownPayment + purchaseFees;
    var monthlyPayment = calculateMonthlyPayment(
      loanPrincipal,
      input.mortgageAnnualRate,
      totalLoanMonths,
    );
    var monthlyMortgageRate = input.mortgageAnnualRate / 100 / 12;
    var rateChangeMonth =
      input.rateChangeYear > 0 ? input.rateChangeYear * 12 + 1 : null;
    var monthlyPaymentAfterRateChange = null;
    var initialMonthlyPayment = monthlyPayment;
    var monthlyInvestmentRate =
      Math.pow(1 + input.investmentAnnualReturnRate / 100, 1 / 12) - 1;
    var initialInvestment = initialExpenses;

    var remainingLoan = loanPrincipal;
    var rentInvestmentBalance = initialInvestment;
    var rentInvestmentCostBasis = initialInvestment;
    var totalMortgagePaid = 0;
    var totalInterestPaid = 0;
    var totalPrincipalPaid = 0;
    var totalOwnerCost = 0;
    var totalRentPaid = 0;
    var totalRenewalFees = 0;
    var totalRepairCost = 0;
    var totalMortgageTaxCredit = 0;
    var totalRentInvestmentDeposits = 0;
    var totalRentInvestmentWithdrawals = 0;
    var totalInvestmentReturn = 0;
    var totalWithdrawalTax = 0;
    var lowestRentInvestmentBalance = initialInvestment;
    var cumulativeBuyCashOutflow = initialExpenses;
    var cumulativeRentCashOutflow = 0;
    var snapshots = [];

    for (var month = 1; month <= totalSimulationMonths; month += 1) {
      var yearsBeforeMonth = (month - 1) / 12;
      if (month === rateChangeMonth) {
        // Re-amortize the remaining balance over the remaining term, like a
        // fixed-period rate ending; the 5-year / 125% payment rules of
        // variable-rate loans are not modelled.
        monthlyMortgageRate = input.mortgageAnnualRateAfterChange / 100 / 12;
        monthlyPayment = calculateMonthlyPayment(
          remainingLoan,
          input.mortgageAnnualRateAfterChange,
          totalLoanMonths - (month - 1),
        );
        monthlyPaymentAfterRateChange = monthlyPayment;
      }
      var interestPaid = remainingLoan * monthlyMortgageRate;
      var scheduledPayment =
        remainingLoan > 0
          ? Math.min(monthlyPayment, remainingLoan + interestPaid)
          : 0;
      var principalPaid = Math.min(
        Math.max(scheduledPayment - interestPaid, 0),
        remainingLoan,
      );
      remainingLoan = Math.max(0, remainingLoan - principalPaid);

      var ownerCost =
        input.monthlyOwnerCost *
        Math.pow(1 + input.ownerCostAnnualGrowthRate / 100, yearsBeforeMonth);
      var buyHousingCost = scheduledPayment + ownerCost;
      // Major repairs fall at year-ends when the building age reaches a
      // multiple of the interval, priced with the owner-cost growth rate.
      var repairCost =
        month % 12 === 0 &&
        input.repairCost > 0 &&
        (input.buildingAgeYears + month / 12) % input.repairIntervalYears === 0
          ? input.repairCost *
            Math.pow(
              1 + input.ownerCostAnnualGrowthRate / 100,
              yearsBeforeMonth,
            )
          : 0;
      // The deduction uses the year-end balance and is refunded to the buyer,
      // lowering that month's net cost; this assumes enough tax is owed.
      var mortgageTaxCredit =
        month % 12 === 0 && month / 12 <= input.mortgageTaxCreditYears
          ? (Math.min(remainingLoan, input.mortgageTaxCreditLoanCap) *
              input.mortgageTaxCreditRate) /
            100
          : 0;
      var buyNetHousingCost = buyHousingCost + repairCost - mortgageTaxCredit;
      // Market rent growth applies to a unit of constant age; the home being
      // compared keeps ageing, so its rent also falls behind the market.
      var rentPaid =
        input.monthlyRent *
        Math.pow(1 + input.rentAnnualGrowthRate / 100, yearsBeforeMonth) *
        Math.pow(1 - input.rentAgingRate / 100, yearsBeforeMonth);
      var renewalFee =
        month > 1 && (month - 1) % renewalIntervalMonths === 0
          ? rentPaid * input.renewalFeeMonths
          : 0;
      var rentHousingCost = rentPaid + renewalFee;

      // The renter spends exactly what the buyer spends: whatever buying would
      // have cost beyond the rent is invested, and a negative gap is paid from
      // the investment account.
      var rentInvestmentContribution = buyNetHousingCost - rentHousingCost;
      var investmentReturn =
        rentInvestmentBalance > 0
          ? rentInvestmentBalance * monthlyInvestmentRate
          : 0;
      rentInvestmentBalance += investmentReturn;
      totalInvestmentReturn += investmentReturn;

      var withdrawalTax = 0;
      if (rentInvestmentContribution >= 0) {
        // A negative balance is debt; deposits repay it before buying units.
        var newUnits = Math.min(
          rentInvestmentContribution,
          rentInvestmentBalance + rentInvestmentContribution,
        );
        rentInvestmentCostBasis += Math.max(0, newUnits);
        rentInvestmentBalance += rentInvestmentContribution;
        totalRentInvestmentDeposits += rentInvestmentContribution;
      } else {
        var withdrawal = -rentInvestmentContribution;
        totalRentInvestmentWithdrawals += withdrawal;
        if (rentInvestmentBalance > 0) {
          // Selling realizes the gain share of each unit, so the gross sale
          // must also cover the tax on that gain.
          var gainShare = Math.max(
            0,
            (rentInvestmentBalance - rentInvestmentCostBasis) /
              rentInvestmentBalance,
          );
          var netPerSold = 1 - (gainShare * input.investmentTaxRate) / 100;
          var grossSale = Math.min(
            rentInvestmentBalance,
            withdrawal / netPerSold,
          );
          withdrawalTax = grossSale * (1 - netPerSold);
          rentInvestmentCostBasis -=
            (grossSale * rentInvestmentCostBasis) / rentInvestmentBalance;
          rentInvestmentBalance -= grossSale;
          withdrawal -= grossSale * netPerSold;
          if (rentInvestmentBalance < 0.000001) {
            rentInvestmentBalance = 0;
            rentInvestmentCostBasis = 0;
          }
        }
        // Once the account is empty the shortfall becomes interest-free debt.
        rentInvestmentBalance -= withdrawal;
        totalWithdrawalTax += withdrawalTax;
      }
      lowestRentInvestmentBalance = Math.min(
        lowestRentInvestmentBalance,
        rentInvestmentBalance,
      );

      totalMortgagePaid += scheduledPayment;
      totalInterestPaid += interestPaid;
      totalPrincipalPaid += principalPaid;
      totalOwnerCost += ownerCost;
      totalRentPaid += rentPaid;
      totalRenewalFees += renewalFee;
      totalRepairCost += repairCost;
      totalMortgageTaxCredit += mortgageTaxCredit;
      cumulativeBuyCashOutflow += buyNetHousingCost;
      cumulativeRentCashOutflow += rentHousingCost;

      var yearsElapsed = month / 12;
      var landValue =
        initialLandValue *
        Math.pow(1 + input.landAnnualGrowthRate / 100, yearsElapsed);
      var buildingDepreciationFactor = Math.max(
        0,
        1 - yearsElapsed / buildingRemainingLifeYears,
      );
      var buildingValue =
        initialBuildingValue * buildingDepreciationFactor;
      var houseValue = landValue + buildingValue;
      var sellingCost = (houseValue * input.sellingFeeRate) / 100;
      var homeEquityBeforeSellingCost = houseValue - remainingLoan;
      var homeEquity = homeEquityBeforeSellingCost - sellingCost;
      var rentInvestmentValue =
        rentInvestmentBalance > 0
          ? calculateAfterTaxValue(
              rentInvestmentBalance,
              rentInvestmentCostBasis,
              input.investmentTaxRate,
            )
          : rentInvestmentBalance;
      var buyTotalAssets = homeEquity;
      var rentTotalAssets = rentInvestmentValue;

      snapshots.push({
        month: month,
        year: Math.ceil(month / 12),
        houseValue: houseValue,
        landValue: landValue,
        buildingValue: buildingValue,
        scheduledPayment: scheduledPayment,
        interestPaid: interestPaid,
        principalPaid: principalPaid,
        remainingLoan: remainingLoan,
        ownerCost: ownerCost,
        buyHousingCost: buyHousingCost,
        repairCost: repairCost,
        mortgageTaxCredit: mortgageTaxCredit,
        buyNetHousingCost: buyNetHousingCost,
        rentPaid: rentPaid,
        renewalFee: renewalFee,
        rentHousingCost: rentHousingCost,
        rentInvestmentContribution: rentInvestmentContribution,
        investmentReturn: investmentReturn,
        withdrawalTax: withdrawalTax,
        rentInvestmentBalance: rentInvestmentBalance,
        rentInvestmentValue: rentInvestmentValue,
        // Breakdown of rentTotalAssets: initial capital + net contributions
        // + returns − tax (paid on withdrawals and owed on a sale now).
        cumulativeRentNetContribution:
          totalRentInvestmentDeposits - totalRentInvestmentWithdrawals,
        cumulativeInvestmentReturn: totalInvestmentReturn,
        cumulativeRentInvestmentTax:
          totalWithdrawalTax + (rentInvestmentBalance - rentInvestmentValue),
        homeEquityBeforeSellingCost: homeEquityBeforeSellingCost,
        sellingCost: sellingCost,
        homeEquity: homeEquity,
        buyTotalAssets: buyTotalAssets,
        rentTotalAssets: rentTotalAssets,
        cumulativeBuyCashOutflow: cumulativeBuyCashOutflow,
        cumulativeRentCashOutflow: cumulativeRentCashOutflow,
        difference: rentTotalAssets - buyTotalAssets,
      });
    }

    var firstSnapshot = snapshots[0];
    var finalSnapshot = snapshots[snapshots.length - 1];
    if (!finalSnapshot) {
      throw new Error('Simulation produced no monthly snapshots');
    }
    var finalRentInvestmentTax =
      finalSnapshot.rentInvestmentBalance - finalSnapshot.rentInvestmentValue;

    return {
      input: input,
      snapshots: snapshots,
      summary: {
        initialDownPayment: initialDownPayment,
        purchaseFees: purchaseFees,
        initialExpenses: initialExpenses,
        initialInvestment: initialInvestment,
        loanPrincipal: loanPrincipal,
        initialLandValue: initialLandValue,
        initialBuildingValue: initialBuildingValue,
        buildingUsefulLifeYears: buildingUsefulLifeYears,
        buildingRemainingLifeYears: buildingRemainingLifeYears,
        monthlyPayment: initialMonthlyPayment,
        initialMonthlyOwnerCost: firstSnapshot.ownerCost,
        finalMonthlyOwnerCost: finalSnapshot.ownerCost,
        initialMonthlyBuyCost: firstSnapshot.buyHousingCost,
        finalMonthlyBuyCost: finalSnapshot.buyHousingCost,
        initialMonthlyRent: firstSnapshot.rentPaid,
        finalMonthlyRent: finalSnapshot.rentPaid,
        totalMortgagePaid: totalMortgagePaid,
        totalInterestPaid: totalInterestPaid,
        totalPrincipalPaid: totalPrincipalPaid,
        totalOwnerCost: totalOwnerCost,
        totalBuyCashOutflow: cumulativeBuyCashOutflow,
        totalRentPaid: totalRentPaid,
        totalRenewalFees: totalRenewalFees,
        totalRentCashOutflow: cumulativeRentCashOutflow,
        totalMortgageTaxCredit: totalMortgageTaxCredit,
        totalRepairCost: totalRepairCost,
        monthlyPaymentAfterRateChange: monthlyPaymentAfterRateChange,
        totalRentInvestmentDeposits: totalRentInvestmentDeposits,
        totalRentInvestmentWithdrawals: totalRentInvestmentWithdrawals,
        lowestRentInvestmentBalance: lowestRentInvestmentBalance,
        finalHouseValue: finalSnapshot.houseValue,
        finalLandValue: finalSnapshot.landValue,
        finalBuildingValue: finalSnapshot.buildingValue,
        finalRemainingLoan: finalSnapshot.remainingLoan,
        finalSellingCost: finalSnapshot.sellingCost,
        finalHomeEquity: finalSnapshot.homeEquity,
        finalRentInvestmentBalance: finalSnapshot.rentInvestmentBalance,
        finalRentInvestmentTax: finalRentInvestmentTax,
        finalRentInvestmentValue: finalSnapshot.rentInvestmentValue,
        finalBuyTotalAssets: finalSnapshot.buyTotalAssets,
        finalRentTotalAssets: finalSnapshot.rentTotalAssets,
        houseAppreciation: finalSnapshot.houseValue - input.housePrice,
        rentInvestmentGain: totalInvestmentReturn,
        totalWithdrawalTax: totalWithdrawalTax,
        finalInvestmentTax: finalRentInvestmentTax + totalWithdrawalTax,
        finalDifference: finalSnapshot.difference,
        rentWins: finalSnapshot.difference > 0,
      },
    };
  }
  // Finds the value of one assumption at which both paths end equal, holding
  // everything else fixed. `apply` returns a copy of the input with the value
  // substituted; the final difference must be monotonic in that value.
  // `value` is null when the winner never changes within [low, high].
  function findBreakEven(input, apply, low, high) {
    var rentWinsAt = function (value) {
      return simulate(apply(input, value)).summary.finalDifference > 0;
    };
    var rentWinsAtLow = rentWinsAt(low);
    var rentWinsAtHigh = rentWinsAt(high);
    var result = {
      value: null,
      rentWinsAtLow: rentWinsAtLow,
      rentWinsAtHigh: rentWinsAtHigh,
    };
    if (rentWinsAtLow === rentWinsAtHigh) {
      return result;
    }
    for (var iteration = 0; iteration < 30; iteration += 1) {
      var middle = (low + high) / 2;
      if (rentWinsAt(middle) === rentWinsAtLow) {
        low = middle;
      } else {
        high = middle;
      }
    }
    result.value = (low + high) / 2;
    return result;
  }

  return {
    defaultInput: defaultInput,
    validateSimulationInput: validateSimulationInput,
    resolveDownPayment: resolveDownPayment,
    calculateMonthlyPayment: calculateMonthlyPayment,
    simulate: simulate,
    findBreakEven: findBreakEven,
    SimulationInputError: SimulationInputError,
  };
});
