(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MortgageComparator = factory();
  }
})(typeof globalThis === 'object' ? globalThis : window, function () {
  'use strict';

  var defaultInput = {
    currency: 'JPY',
    housePrice: 52000000,
    downPaymentMode: 'percentage',
    downPaymentPercentage: 20,
    downPaymentAmount: 10000000,
    mortgageAnnualRate: 1,
    loanTermYears: 35,
    horizonYears: 20,
    landAnnualGrowthRate: 2,
    buildingStructure: 'rc',
    buildingAgeYears: 15,
    landSharePercentage: 35,
    purchaseFeeRate: 0,
    purchaseFeeFixed: 0,
    sellingFeeRate: 3,
    monthlyOwnerCost: 37000,
    investmentAnnualReturnRate: 5,
    monthlyRent: 120000,
    rentAnnualGrowthRate: 2,
    monthlyContributionBasis: 'mortgage-plus-owner-cost',
    customMonthlyContribution: 0,
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

  function isValidContributionBasis(value) {
    return (
      value === 'mortgage-only' ||
      value === 'mortgage-plus-owner-cost' ||
      value === 'custom'
    );
  }

  function isValidBuildingStructure(value) {
    return value === 'wood' || value === 'rc';
  }

  function getBuildingUsefulLifeYears(structure) {
    return structure === 'rc' ? 47 : 22;
  }

  function validateSimulationInput(input) {
    var errors = {};
    var housePriceIsValid =
      isFiniteNumber(input.housePrice) && input.housePrice > 0;

    if (
      typeof input.currency !== 'string' ||
      input.currency.trim().length === 0
    ) {
      errors.currency = '请选择货币。';
    }

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

    if (!isPositiveInteger(input.horizonYears)) {
      errors.horizonYears = '模拟期限必须是正整数。';
    } else if (
      isPositiveInteger(input.loanTermYears) &&
      input.horizonYears > input.loanTermYears
    ) {
      errors.horizonYears = '模拟期限不能超过贷款期限。';
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

    if (!isFiniteNumber(input.purchaseFeeFixed) || input.purchaseFeeFixed < 0) {
      errors.purchaseFeeFixed = '固定购房费用不能为负数。';
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
      !isFiniteNumber(input.monthlyRent) ||
      input.monthlyRent < 0 ||
      input.monthlyRent > 200000
    ) {
      errors.monthlyRent = '当前月租必须在 0 到 200,000 之间。';
    }

    if (
      !isFiniteNumber(input.rentAnnualGrowthRate) ||
      input.rentAnnualGrowthRate < -100
    ) {
      errors.rentAnnualGrowthRate = '租金增长率不能低于 -100%。';
    }

    if (
      !isFiniteNumber(input.investmentAnnualReturnRate) ||
      input.investmentAnnualReturnRate < -20 ||
      input.investmentAnnualReturnRate > 20
    ) {
      errors.investmentAnnualReturnRate = '年化投资收益率必须在 -20% 到 20% 之间。';
    }

    if (!isValidContributionBasis(input.monthlyContributionBasis)) {
      errors.monthlyContributionBasis = '请选择有效的每月投入基准。';
    } else if (
      input.monthlyContributionBasis === 'custom' &&
      (!isFiniteNumber(input.customMonthlyContribution) ||
        input.customMonthlyContribution < 0)
    ) {
      errors.customMonthlyContribution = '自定义月投入不能为负数。';
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

  function simulate(input) {
    var errors = validateSimulationInput(input);
    if (Object.keys(errors).length > 0) {
      throw new SimulationInputError(errors);
    }

    var totalLoanMonths = input.loanTermYears * 12;
    var totalSimulationMonths = input.horizonYears * 12;
    var initialDownPayment = resolveDownPayment(input);
    var loanPrincipal = input.housePrice - initialDownPayment;
    var buildingUsefulLifeYears = getBuildingUsefulLifeYears(
      input.buildingStructure,
    );
    var buildingRemainingLifeYears = Math.max(
      1,
      buildingUsefulLifeYears - input.buildingAgeYears,
    );
    var initialLandValue =
      (input.housePrice * input.landSharePercentage) / 100;
    var initialBuildingValue = input.housePrice - initialLandValue;
    var purchaseFees =
      (input.housePrice * input.purchaseFeeRate) / 100 +
      input.purchaseFeeFixed;
    var monthlyPayment = calculateMonthlyPayment(
      loanPrincipal,
      input.mortgageAnnualRate,
      totalLoanMonths,
    );
    var monthlyMortgageRate = input.mortgageAnnualRate / 100 / 12;
    var monthlyInvestmentRate =
      Math.pow(1 + input.investmentAnnualReturnRate / 100, 1 / 12) - 1;
    var initialInvestment = initialDownPayment + purchaseFees;

    var remainingLoan = loanPrincipal;
    var investmentBalance = initialInvestment;
    var totalMortgagePaid = 0;
    var totalInterestPaid = 0;
    var totalPrincipalPaid = 0;
    var totalRentPaid = 0;
    var cumulativeBuyCashOutflow = initialDownPayment + purchaseFees;
    var cumulativeInvestmentContribution = initialInvestment;
    var snapshots = [];

    for (var month = 1; month <= totalSimulationMonths; month += 1) {
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
      totalMortgagePaid += scheduledPayment;
      totalInterestPaid += interestPaid;
      totalPrincipalPaid += principalPaid;
      cumulativeBuyCashOutflow +=
        scheduledPayment + input.monthlyOwnerCost;

      var rentPaid =
        input.monthlyRent *
        Math.pow(1 + input.rentAnnualGrowthRate / 100, (month - 1) / 12);
      var monthlyInvestmentContribution =
        input.monthlyContributionBasis === 'mortgage-only'
          ? monthlyPayment - rentPaid
          : input.monthlyContributionBasis === 'mortgage-plus-owner-cost'
            ? monthlyPayment + input.monthlyOwnerCost - rentPaid
            : input.customMonthlyContribution;
      totalRentPaid += rentPaid;
      investmentBalance =
        investmentBalance * (1 + monthlyInvestmentRate) +
        monthlyInvestmentContribution;
      cumulativeInvestmentContribution += monthlyInvestmentContribution;

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
        homeEquityBeforeSellingCost: homeEquityBeforeSellingCost,
        sellingCost: sellingCost,
        rentPaid: rentPaid,
        homeEquity: homeEquity,
        investmentContribution: monthlyInvestmentContribution,
        investmentBalance: investmentBalance,
        cumulativeBuyCashOutflow: cumulativeBuyCashOutflow,
        cumulativeInvestmentContribution: cumulativeInvestmentContribution,
        difference: investmentBalance - homeEquity,
      });
    }

    var finalSnapshot = snapshots[snapshots.length - 1];
    if (!finalSnapshot) {
      throw new Error('Simulation produced no monthly snapshots');
    }

    return {
      input: input,
      snapshots: snapshots,
      summary: {
        initialDownPayment: initialDownPayment,
        initialInvestment: initialInvestment,
        purchaseFees: purchaseFees,
        initialExpenses: initialDownPayment + purchaseFees,
        loanPrincipal: loanPrincipal,
        initialLandValue: initialLandValue,
        initialBuildingValue: initialBuildingValue,
        buildingUsefulLifeYears: buildingUsefulLifeYears,
        buildingRemainingLifeYears: buildingRemainingLifeYears,
        monthlyPayment: monthlyPayment,
        monthlyBuyCost: monthlyPayment + input.monthlyOwnerCost,
        totalMortgagePaid: totalMortgagePaid,
        totalInterestPaid: totalInterestPaid,
        totalPrincipalPaid: totalPrincipalPaid,
        totalRentPaid: totalRentPaid,
        totalBuyCashOutflow: cumulativeBuyCashOutflow,
        totalInvestmentContributions: cumulativeInvestmentContribution,
        initialMonthlyRent: snapshots[0].rentPaid,
        finalMonthlyRent: finalSnapshot.rentPaid,
        initialMonthlyInvestmentContribution: snapshots[0].investmentContribution,
        finalMonthlyInvestmentContribution: finalSnapshot.investmentContribution,
        finalHouseValue: finalSnapshot.houseValue,
        finalLandValue: finalSnapshot.landValue,
        finalBuildingValue: finalSnapshot.buildingValue,
        finalRemainingLoan: finalSnapshot.remainingLoan,
        finalSellingCost: finalSnapshot.sellingCost,
        finalHomeEquity: finalSnapshot.homeEquity,
        finalInvestmentBalance: finalSnapshot.investmentBalance,
        houseAppreciation: finalSnapshot.houseValue - input.housePrice,
        investmentGain:
          finalSnapshot.investmentBalance - cumulativeInvestmentContribution,
        finalDifference: finalSnapshot.difference,
        investmentWins: finalSnapshot.difference > 0,
      },
    };
  }

  return {
    defaultInput: defaultInput,
    validateSimulationInput: validateSimulationInput,
    resolveDownPayment: resolveDownPayment,
    calculateMonthlyPayment: calculateMonthlyPayment,
    simulate: simulate,
    SimulationInputError: SimulationInputError,
  };
});
