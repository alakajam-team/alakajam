/* eslint-env jquery */

module.exports = function viewEntryVoting () {
  const $stars = $('.js-star')
  const $starsArray = []
  $stars.each(function () {
    $starsArray.push($(this))
  })

  $stars.mouseenter(function () {
    const $this = $(this)
    const category = $this.attr('data-category')
    const rating = parseInt($this.attr('data-rating'))
    setCurrentCategory(category)
    setRating(category, rating, false)
  })

  $stars.mouseleave(function () {
    setCurrentCategory(null)
  })

  $stars.click(function () {
    const $this = $(this)
    const category = $this.attr('data-category')
    const rating = parseInt($this.attr('data-rating'))
    setRating(category, rating, true)
  })

  let currentCategory = null

  function setCurrentCategory (category) {
    if (currentCategory !== category) {
      if (currentCategory !== null) {
        const confirmedRating = parseInt($('#js-vote-' + currentCategory).val() || 0)
        setRating(currentCategory, confirmedRating, true)
      }
      currentCategory = category
    }
  }

  function setRating (category, rating, confirmed) {
    $starsArray.forEach(function ($star) {
      if ($star.attr('data-category') === category) {
        const starRating = parseInt($star.attr('data-rating'))
        if ((starRating !== 0 && starRating > rating) ||
            (starRating === 0 && rating !== 0)) {
          if (!$star.hasClass('fa-circle-o')) {
            $star.removeClass('fa-star')
            $star.addClass('fa-star-o')
          }
          $star.removeClass('confirmed')
        } else {
          if (!$star.hasClass('fa-circle-o')) {
            $star.removeClass('fa-star-o')
            $star.addClass('fa-star')
          }
          if (confirmed) {
            $star.addClass('confirmed')
          } else {
            $star.removeClass('confirmed')
          }
        }
      }
    })

    const $ratingLabel = $('#js-vote-label-' + category)
    $ratingLabel.text(rating !== 0 ? rating : '\xa0') // &nbsp;
    if (confirmed) {
      const previousValue = $('#js-vote-' + category).val()
      const newValue = rating.toFixed(3)
      console.log(previousValue, newValue)

      $ratingLabel.addClass('confirmed')
      if (previousValue !== newValue) {
        $('#js-vote-' + category).val(newValue)
        $('.comment input[name=save]').val('Save comment & ratings')
      }
    } else {
      $ratingLabel.removeClass('confirmed')
    }
  }
}
