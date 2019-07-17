const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

//Post Model
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');

// Validation
const validatePostInput = require('../../validation/posts');

// @route GET api/posts/test
// @desc Tests post route
// @access Public route
router.get('/test', (req, res) => res.json({ msg: 'Posts Work' }));

// @route GET api/posts
// @desc Get all posts
// @access Public route
router.get('/', (req, res) => {
  Post.find()
    .sort({ date: -1 })
    .then(posts => {
      res.json(posts);
    })
    .catch(err => res.status(404).json({ nopostfound: 'No post found' }));
});

// @route GET api/posts/:id
// @desc Get a single post by id
// @access Public route
router.get('/:id', (req, res) => {
  Post.findById(req.params.id)
    .then(post => {
      res.json(post);
    })
    .catch(err =>
      res.status(404).json({ nopostfound: 'No post found with that id' })
    );
});

// @route POST api/posts
// @desc Create a post
// @access Private route
router.post(
  '/',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    const { errors, isValid } = validatePostInput(req.body);
    //Check Validation
    if (!isValid) {
      //if any errors send 400 with errors object
      return res.status(400).json(errors);
    }
    const newPost = new Post({
      text: req.body.text,
      name: req.body.name,
      avatar: req.body.avatar,
      user: req.user.id
    });
    newPost.save().then(post => res.json(post));
  }
);
// @route DELETE api/posts/:id
// @desc Delete a post
// @access Private route
router.delete(
  '/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Profile.findOne({ user: req.user.id }).then(profile => {
      Post.findById(req.params.id)
        .then(post => {
          // Check for post owner
          if (post.user.toString() !== req.user.id) {
            return res
              .status(401)
              .json({ notauthorized: 'User not authorized' });
          }
          //Delete
          post.remove().then(() => res.json({ success: true }));
        })
        .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
    });
  }
);

// @route POST api/posts/like/:id
// @desc Like a post
// @access Private route
router.put(
  '/like/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (
        post.likes.filter(like => like.user.toString() === req.user.id).length >
        0
      ) {
        return res.status(400).json({ msg: 'Post already liked' });
      }

      post.likes.unshift({ user: req.user.id });

      await post.save();

      res.json(post.likes);
    } catch (err) {
      console.log(err);
      res.status(500).send('Server Error');
    }
  }
);

// router.post(
//   '/like/:id',
//   passport.authenticate('jwt', { session: false }),
//   (req, res) => {
//     Post.findById(req.params.id).then(post => {
//       const updatedLikes = post.likes.filter(like => like.user != req.user.id);
//       if (updatedLikes.length === post.likes.length) {
//         //was never liked, so like
//         post.likes.unshift({ user: req.user.id });
//         post
//           .save()
//           .then(post => res.json(post))
//           .catch(err => res.status(400).json({ like: 'Unable to like post' }));
//         return;
//       }
//       //was liked, so unlike
//       post.likes = updatedLikes;
//       post
//         .save()
//         .then(post => res.json(post))
//         .catch(err => res.status(400).json({ like: 'Unable to unlike post' }));
//     });
//   }
// );

// @route POST api/posts/unlike/:id
// @desc Unlike a post
// @access Private route
router.put(
  '/unlike/:id',
  passport.authenticate('jwt', { session: false }),
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      // Check if the post has already been liked
      if (
        post.likes.filter(like => like.user.toString() === req.user.id)
          .length === 0
      ) {
        return res.status(400).json({ msg: 'Post has not yet been liked' });
      }

      // Get remove index
      const removeIndex = post.likes
        .map(like => like.user.toString())
        .indexOf(req.user.id);

      post.likes.splice(removeIndex, 1);

      await post.save();

      res.json(post.likes);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route  POST api/posts/comment/:id
// @desc   Add comment to post
// @access Private route
router.post(
  '/comment/:id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        const newComment = {
          text: req.body.text,
          name: req.body.name,
          avatar: req.body.avatar,
          user: req.user.id
        };
        // Add to comments array
        post.comments.unshift(newComment);

        //Save
        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
  }
);
// @route  DELETE api/posts/comment/:id/:comment_id
// @desc   Delete comment from post
// @access Private route
router.delete(
  '/comment/:id/:comment_id',
  passport.authenticate('jwt', { session: false }),
  (req, res) => {
    Post.findById(req.params.id)
      .then(post => {
        //Check to see if comment exists
        if (
          post.comments.filter(
            comment => comment._id.toString() === req.params.comment_id
          ).length === 0
        ) {
          return res
            .status(404)
            .json({ commentdoesnotexist: 'Comment does not exist' });
        }
        // Get remove index
        const removeIndex = post.comments
          .map(item => item._id.toString())
          .indexOf(req.params.comment_id);

        //Splice out of the array
        post.comments.splice(removeIndex, 1);

        post.save().then(post => res.json(post));
      })
      .catch(err => res.status(404).json({ postnotfound: 'No post found' }));
  }
);
module.exports = router;
